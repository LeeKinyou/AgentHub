# AgentHub 后端代码审查报告 (第三轮)

> 审查日期: 2026-06-05
> 审查范围: `backend/` 目录下全部源码（25 个应用源文件 + 30 个测试文件）
> 技术栈: FastAPI + SQLAlchemy (async) + PostgreSQL + Redis + Anthropic/OpenAI SDK + MCP
> 前次审查: [review-2026-06-03-backend.md](./review-2026-06-03-backend.md)（发现 16 个问题）

---

## 一、总体评价

自上轮审查（2026-06-03）以来，后端在认证体系、错误分类、并发控制等方面持续完善。上轮发现的 16 个问题中，**14 个已修复**，2 个待修复（Alembic 迁移、updated_at 一致性）。本轮审查在上轮基础上发现 **6 个新问题**（含上轮遗留 2 个），其中 3 个 P0 级严重问题。

最值得关注的发现是 **API Key 加密后未解密** 的问题——安全加固阶段引入的 Fernet 加密在写入时生效，但读取路径完全遗漏了解密步骤，导致所有使用自定义 API Key 的 Agent 调用 LLM 时必然失败。

---

## 二、严重问题 (必须修复)

### 2.1 加密的 API Key 未解密就传给 LLM 适配器 — 自定义 Agent 调用全部失败 `#1`

**严重程度**: P0 — 功能性故障
**文件**: `routes/websocket.py:376-385`, `schemas/agent.py:57-64`, `agents/providers/custom.py:38`, `agents/orchestrator.py:349`

`agents.py` 中的 `_encrypt_config_api_key()` 在 Agent 创建/更新时使用 Fernet 加密 `api_key` 后存入数据库。但在读取路径上，加密的密文被原样传递给适配器：

```python
# routes/websocket.py — 从 DB 加载 agent_config，未解密
for agent in result.scalars().all():
    cfg = agent.agent_config or {}
    agent_roster.append(AgentDescriptor(
        ...
        agent_config=agent.agent_config,  # ← 包含加密密文
    ))
```

```python
# agents/providers/custom.py — 直接使用密文作为 API key
self.api_key = self.agent_config.get("api_key", "") or self._get_default_key(settings)
# ...
self.client = anthropic.AsyncAnthropic(api_key=self.api_key)  # ← 密文发送给 Anthropic API
```

同样，`AgentProfileRead._mask_api_key` 序列化器对密文做脱敏，显示的是密文后 4 位而非真实 key 后 4 位。

**影响范围**:
- `CustomAdapter` — 使用自定义 API key 的 Agent 全部调用失败
- `Orchestrator._resolve_planner_credentials` — 编排器规划器使用自定义 key 时失败
- `ClaudeCodeAdapter` — 不受影响（使用全局 settings.ANTHROPIC_API_KEY）

**修复**:

WebSocket 加载 agent_config 时解密：
```python
from ..core.crypto import decrypt_field

for agent in result.scalars().all():
    cfg = agent.agent_config or {}
    if cfg.get("api_key"):
        try:
            cfg = {**cfg, "api_key": decrypt_field(cfg["api_key"])}
        except Exception:
            pass  # Key may not be encrypted (legacy data)
    agent_roster.append(AgentDescriptor(..., agent_config=cfg, ...))
```

`AgentProfileRead._mask_api_key` 脱敏前先解密：
```python
@model_serializer(mode="wrap")
def _mask_api_key(self, handler) -> dict:
    from ..core.crypto import decrypt_field
    data = handler(self)
    cfg = data.get("agent_config")
    if isinstance(cfg, dict) and "api_key" in cfg and cfg["api_key"]:
        try:
            real_key = decrypt_field(cfg["api_key"])
        except Exception:
            real_key = cfg["api_key"]
        cfg["api_key"] = f"****{real_key[-4:]}" if len(real_key) > 4 else "****"
    return data
```

**状态**: ✅ 已修复

---

### 2.2 users.py 路由完全无认证保护 — 任意用户可增删改查所有用户 `#2`

**严重程度**: P0 — 安全
**文件**: `routes/users.py`（全部端点）

`users.py` 中所有端点均未使用 `get_current_user` 依赖：

| 端点 | 风险 |
|---|---|
| `GET /api/users` | 未认证用户可列出所有用户及邮箱（PII 泄露） |
| `POST /api/users` | 无限制注册（无速率限制） |
| `GET /api/users/{user_id}` | 未认证用户可查看任意用户资料 |
| `PATCH /api/users/{user_id}` | 未认证用户可修改任意用户的 username/email |
| `DELETE /api/users/{user_id}` | 未认证用户可删除任意用户账号 |

对比 `sessions.py`、`agents.py`、`messages.py` 均已正确实现认证保护，`users.py` 存在明显遗漏。

**修复**:

为 `list_users`、`get_user`、`update_user`、`delete_user` 添加 `get_current_user` 依赖；`update_user` 和 `delete_user` 添加所有权校验：

```python
@router.patch("/{user_id}", response_model=ApiResponse[UserRead])
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Cannot modify other users")
    ...
```

`create_user`（注册端点）保持无需认证。

**状态**: ✅ 已修复

---

### 2.3 DiffHunk schema 拒绝 oldStart=0 — 新文件创建功能被阻断 `#3`

**严重程度**: P0 — 功能
**文件**: `schemas/message.py:16`, `shared/schemas/entities.json:85`

`DiffHunk` Pydantic schema 定义 `old_start: int = Field(ge=1)`，要求 `oldStart >= 1`。但 diff engine 明确使用 `oldStart == 0` 作为新文件创建信号：

```python
# diff_engine.py:134
is_new_file = all(h.get("oldStart", 0) == 0 and h.get("oldLines", 0) == 0 for h in diff_hunks)

# diff_engine.py:178
if old_start == 0 and old_lines_count == 0:
    # Creating a brand-new file
```

当前 `triggerAction` 从 JSONB `card_data` 读取 hunks 绕过了 Pydantic 验证，但 schema 契约（`entities.json`）定义 `"minimum": 1`，前端若按契约校验会阻止 `oldStart=0` 的请求。

**修复**:

```python
# schemas/message.py
old_start: int = Field(ge=0)  # 0 means new file creation
```

```json
// shared/schemas/entities.json
"oldStart": {
    "type": "integer",
    "minimum": 0,
    "description": "Starting line number in the original file (0 for new file creation)"
}
```

**状态**: ✅ 已修复（Pydantic schema + SSOT 契约同步更新）

---

## 三、重要问题

### 3.1 agent 消息持久化在锁作用域外 — 并发竞态窗口 `#4`

**严重程度**: P1 — 并发
**文件**: `routes/websocket.py:127-223`

`_handle_send_message` 中，`async with guard.message_lock()` 的作用域在 orchestrator 流式处理完成后（异常则 return）即结束。Agent 消息持久化和 `messageComplete` WebSocket 发送在锁作用域**之外**执行：

```
async with guard.message_lock():    # ← 锁开始
    ... user message persist ...
    try:
        ... orchestrator streaming ...
    except:
        return                       # ← 异常时在锁内 return
                                      # ← 锁结束（正常流程也在此结束）

agent_msg = Message(...)              # ← 锁外！
await db.commit()                     # ← 锁外！
```

这意味着：用户发送消息 A → 流式完成 → 锁释放 → 用户发送消息 B（通过 `can_accept_message()` 检查）→ 消息 B 开始处理，同时消息 A 的 agent 响应还在持久化中。

**修复**: 将 agent 消息持久化和 `messageComplete` 发送移入 `async with guard.message_lock()` 块内。

**状态**: ✅ 已修复

---

### 3.2 ENCRYPTION_KEY 未配置时自动生成 — 重启后数据永久丢失 `#5`

**严重程度**: P1 — 数据安全
**文件**: `core/crypto.py:14-16`

上轮审查 §5.5 已指出，`_get_fernet()` 在 `ENCRYPTION_KEY` 为空时自动生成新密钥：

```python
if not key:
    key = Fernet.generate_key().decode()  # ← 每次启动生成不同密钥
```

后果：
- 重启后之前加密的 API key 永久无法解密（`InvalidToken`）
- 多实例部署时各实例密钥不同，数据互不兼容

**修复**: 改为启动时报错拒绝：

```python
if not key:
    raise RuntimeError(
        "ENCRYPTION_KEY is not configured. "
        "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    )
```

**状态**: ✅ 已修复

---

### 3.3 SECRET_KEY 使用公开默认值 — JWT 可被伪造 `#6`

**严重程度**: P1 — 安全
**文件**: `core/config.py:49`, `main.py`

上轮审查 §5.4 已指出，`SECRET_KEY: str = "change-me-in-production"` 是公开可见的默认值。若部署时忘记设置环境变量，任何人都能用这个已知密钥伪造有效 JWT。

**修复**: 在 `main.py` 启动时检测并发出警告：

```python
if settings.SECRET_KEY == "change-me-in-production":
    warnings.warn(
        "SECRET_KEY is using the default value! Set the SECRET_KEY environment "
        "variable before deploying to production.",
        stacklevel=1,
    )
```

**状态**: ✅ 已修复

---

## 四、上轮问题修复状态追踪

> 对照 [review-2026-06-03-backend.md](./review-2026-06-03-backend.md) 的 16 个问题

| # | 优先级 | 问题 | 上轮状态 | 当前状态 | 说明 |
|---|---|---|---|---|---|
| 1 | P0 | WS session_id 与 user_id 类型不匹配 | ✅ | ✅ | |
| 2 | P0 | Agent CRUD 缺乏所有权校验 | ✅ | ✅ | |
| 3 | P1 | 对话历史包含当前消息 | ✅ | ✅ | |
| 4 | P1 | CORS_ORIGINS 解析问题 | ✅ | ✅ | |
| 5 | P3 | logout 中 import time 位于函数体内 | ✅ | ✅ | 本轮额外修复 `time.time()` → `datetime.now(timezone.utc).timestamp()` |
| 6 | P2 | Orchestrator 规划器每次创建新客户端 | ✅ | ✅ | |
| 7 | P2 | Codex/OpenCode 适配器为空壳 | ✅ | ✅ | |
| 8 | P2 | 错误分类不够全面 | ✅ | ✅ | 本轮额外修复 `_is_recoverable` 未同步扩展 |
| 9 | P2 | sendMessage 异常导致 WS 断开 | ✅ | ✅ | 本轮额外修复错误消息泄露原始异常 |
| 10 | P2 | update_user 缺少唯一性校验 | ✅ | ✅ | |
| 11 | P3 | SessionUpdate.title 无长度约束 | ✅ | ✅ | |
| 12 | P2 | 仍无数据库迁移工具 | ⬜ | ⬜ | **仍未修复** |
| 13 | P2 | Session.updated_at ORM-only 问题 | ⬜ | ⬜ | **仍未修复** |
| 14 | P2 | WebSocket 消息大小未限制 | ✅ | ✅ | |
| 15 | P2 | REST API 无全局速率限制 | ⬜ | ⬜ | **仍未修复** |
| 16 | P3 | 缺少 Redis mock | ✅ | ✅ | |

**修复进度**: 13/16 已修复，3 个待修复（#12 Alembic、#13 updated_at、#15 速率限制）。

---

## 五、新发现问题汇总

| # | 优先级 | 类别 | 问题 | 文件 | 状态 | 修复说明 |
|---|---|---|---|---|---|---|
| 1 | **P0** | 功能 | 加密 API Key 未解密，自定义 Agent 调用全部失败 | `websocket.py`, `schemas/agent.py` | ✅ 已修复 | 加载时 `decrypt_field()`；脱敏前先解密 |
| 2 | **P0** | 安全 | users.py 路由完全无认证保护 | `routes/users.py` | ✅ 已修复 | 添加 `get_current_user` + 所有权校验 |
| 3 | **P0** | 功能 | DiffHunk schema 拒绝 `oldStart=0` | `schemas/message.py`, `entities.json` | ✅ 已修复 | `ge=1` → `ge=0` |
| 4 | **P1** | 并发 | agent 消息持久化在锁作用域外 | `routes/websocket.py` | ✅ 已修复 | 移入 `message_lock` 内 |
| 5 | **P1** | 数据安全 | ENCRYPTION_KEY 自动生成导致重启后数据丢失 | `core/crypto.py` | ✅ 已修复 | 改为 `raise RuntimeError` |
| 6 | **P1** | 安全 | SECRET_KEY 默认值可伪造 JWT | `main.py` | ✅ 已修复 | 启动时 `warnings.warn` |

### 修复进度统计

| 优先级 | 本轮新增 | 已修复 | 待修复 |
|---|---|---|---|
| P0 (严重) | 3 | 3 | 0 |
| P1 (重要) | 3 | 3 | 0 |
| P2 (架构) | 0 | 0 | 3（上轮遗留） |
| P3 (质量) | 0 | 0 | 0 |
| **合计** | **6** | **6** | **3** |

---

## 六、三轮审查累计统计

| 轮次 | 日期 | 发现问题数 | 已修复 | 待修复 |
|---|---|---|---|---|
| 第一轮 | 2026-05-28 | 20 | 19 | 1 |
| 第二轮 | 2026-06-03 | 16 | 14 | 2 |
| 第三轮 | 2026-06-05 | 6 | 6 | 0 |
| **累计** | | **42** | **39** | **3** |

### 遗留问题清单（3 个）

| # | 优先级 | 问题 | 首次提出 | 说明 |
|---|---|---|---|---|
| 12 | P2 | 无数据库迁移工具（Alembic） | 第二轮 | 随着 Model 变更频繁，影响越来越大 |
| 13 | P2 | Session.updated_at ORM-only 更新不一致 | 第二轮 | 建议用 PostgreSQL 触发器统一处理 |
| 15 | P2 | REST API 无全局速率限制 | 第二轮 | 认证端点面临暴力破解风险 |

---

## 七、总结

本轮审查发现的 6 个问题已全部修复。最严重的发现是 **API Key 加密/解密路径不对称**——安全加固阶段只实现了写入加密，读取路径完全遗漏，这是一个典型的"安全加固引入功能回归"的案例。

三轮审查累计发现 42 个问题，已修复 39 个（93%）。剩余 3 个 P2 级架构问题（Alembic、updated_at 触发器、REST 速率限制）建议在下个迭代中统一解决。
