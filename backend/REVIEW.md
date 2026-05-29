# AgentHub 后端代码审查报告

> 审查日期: 2026-05-28
> 审查范围: `backend/` 目录下全部源码
> 技术栈: FastAPI + SQLAlchemy (async) + PostgreSQL + Redis + Anthropic/OpenAI SDK

---

## 一、总体评价

项目采用了清晰的分层架构 (Routes → Schemas → Models → Core → Agents)，代码风格统一，类型注解完整，Pydantic Schema 与 SQLAlchemy Model 分离合理。Agent 系统的 Adapter 模式和 MCP 集成设计思路正确。

但存在 **多个严重的安全漏洞**、**若干逻辑 Bug**、以及 **明显的架构缺失**，在上线前必须修复。

---

## 二、严重问题 (必须修复)

### 2.1 测试文件硬编码数据库凭据 `#1 ⬜`

**文件**: `tests/conftest.py:15-18`

```python
TEST_DB_HOST = "175.178.158.231"
TEST_DB_PORT = 5432
TEST_DB_USER = "admin"
TEST_DB_PASSWORD = "postgres@kinyou091230"
```

将真实数据库 IP 地址、用户名和密码直接硬编码在源码中，并且已提交到 Git 仓库。这是一个 **严重的安全漏洞**。

**建议**: 使用环境变量或 `.env.test` 文件（加入 `.gitignore`），并立即轮换已泄露的密码。

---

### 2.2 完全没有认证与授权机制 `#2 ⬜`

整个后端没有任何认证中间件。所有 REST API 和 WebSocket 端点都是完全开放的：

- 任何知道 `user_id` 的人可以读取、修改、删除任意用户 (`routes/users.py`)
- 任何知道 `session_id` 的人可以读取任意会话的消息 (`routes/messages.py`)
- 任何知道 `agent_id` 的人可以修改或删除任意 Agent 配置 (`routes/agents.py`)
- WebSocket 连接无任何身份验证 (`routes/websocket.py`)
- `GET /api/users` 暴露所有用户信息，无分页、无鉴权

**建议**: 至少实现 JWT/Session Token 认证中间件，并在每个路由中校验资源所有权。

---

### 2.3 Agent 配置中的 API Key 泄露 `#3 ⬜`

**文件**: `schemas/agent.py:44` — `AgentProfileRead` 包含 `agent_config: dict | None`

当用户查询 Agent 列表或详情时，`agent_config` 中的 `api_key` 会被完整返回给前端。即使是用户自己的 Agent，也不应在响应中暴露原始密钥。

**建议**: 在 `AgentProfileRead` 中对 `api_key` 做脱敏处理（如只显示后 4 位），或创建一个不含敏感字段的响应 Schema。

---

### 2.4 WebSocket triggerAction 缺乏权限校验 `#4 ⬜`

**文件**: `routes/websocket.py:166-169`

```python
result = await db.execute(
    select(Message).where(Message.id == message_uuid)
)
target_msg = result.scalar_one_or_none()
```

`triggerAction` 通过 `message_id` 查找消息，但 **没有校验该消息是否属于当前 WebSocket 连接的 `session_id`**。攻击者可以通过构造 `message_id` 来对任意会话的消息执行 `applyDiff` 操作。

**建议**: 添加 `Message.session_id == session_uuid` 的过滤条件。

---

### 2.5 差分引擎无法验证旧内容 `#5 ⬜`

**文件**: `core/diff_engine.py:63-76`

代码中有大量注释承认无法验证旧内容：

```python
# The hunk's "content" field is the *new* code; we cannot verify the old
# code from it.
```

`DiffHunk` Schema 只有 `content`（新内容），没有 `oldContent` 字段。这意味着 diff 应用是"盲"的——如果文件内容已经变化，hunk 会静默地替换错误的内容，导致代码损坏。

**建议**: 在 `DiffHunk` Schema 中增加 `oldContent` 字段，应用前进行严格匹配验证。

---

### 2.6 create_user 缺乏唯一性校验 `#8 ⬜`

**文件**: `routes/users.py:23-28`

```python
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    user = User(username=body.username, email=body.email, avatar=body.avatar)
    db.add(user)
    await db.flush()
```

当 `username` 或 `email` 已存在时，`flush()` 会抛出 `IntegrityError`，但没有被捕获和友好处理。用户会看到一个 500 错误而非有意义的提示。

**建议**: 在创建前查询是否已存在，或捕获 `IntegrityError` 并返回 `409 Conflict`。

---

## 三、逻辑 Bug

### 3.1 WebSocket 消息的 messageId 每个 chunk 都不同 `#6 ⬜`

**文件**: `routes/websocket.py:112`

```python
"messageId": str(uuid.uuid4()),
```

每发送一个 `messageChunk` 都生成一个新的 `uuid4()` 作为 `messageId`。前端无法通过 `messageId` 将属于同一响应的多个 chunk 关联起来。

**建议**: 在 `sendMessage` 处理开始时生成一个 `message_id`，所有 chunk 和最终的 `messageComplete` 共享同一个 ID。

---

### 3.2 cursor 分页基于非唯一字段 `#7 ⬜`

**文件**: `routes/messages.py:26-27`

```python
if cursor_msg:
    stmt = stmt.where(Message.created_at < cursor_msg.created_at)
```

`created_at` 不是唯一字段。如果多条消息有相同的 `created_at`（高并发下完全可能），分页会出现消息丢失或重复。

**建议**: 使用 `id`（UUID7 本身是时间排序的）作为游标，或者 `ORDER BY created_at, id` 并用 `(created_at, id)` 作为复合游标。

---

### 3.3 session.updated_at 的 onupdate 仅在 ORM 层生效 `#10 ⬜`

**文件**: `models/session.py:21`

```python
updated_at = mapped_column(..., server_default=func.now(), onupdate=func.now())
```

SQLAlchemy 的 `onupdate` 参数只在通过 ORM 的 `session.flush()` 时生效。在 WebSocket 路由中直接 `db.commit()` 更新消息时，Session 的 `updated_at` 不会自动更新。

**建议**: 在 `sendMessage` 处理中手动更新 `session.updated_at`，或使用数据库触发器。

---

### 3.4 错误分类使用精确类型匹配 `#9 ⬜`

**文件**: `core/exception_handler.py:39-43`

```python
mapping = {
    TimeoutError: "TIMEOUT",
    ConnectionError: "CONNECTION_ERROR",
}
return mapping.get(type(exception), "UNKNOWN_ERROR")
```

`type(exception)` 是精确匹配，不会匹配子类。例如 `asyncio.TimeoutError` 是 `TimeoutError` 的子类但 `type()` 不会匹配。应该使用 `isinstance()`。

---

### 3.5 WebSocket 数据未经 Schema 验证 `#20 ⬜`

**文件**: `routes/websocket.py:69`

```python
data = await websocket.receive_json()
```

直接使用原始 dict，没有通过 `WSSendMessage` / `WSTriggerAction` 等 Pydantic Schema 进行验证。这些 Schema 已经定义在 `schemas/ws.py` 中但从未被使用。

**建议**: 使用对应的 Schema 模型验证接收到的数据。

---

### 3.6 规划器凭据解析中的延迟导入 `#20 ⬜`

**文件**: `agents/orchestrator.py:306-307`

```python
@staticmethod
def _resolve_planner_credentials(...):
    from ..core.config import get_settings
```

`get_settings` 已经通过 `@lru_cache` 缓存，延迟导入是不必要的。更重要的是，规划器硬编码使用 Anthropic API，不支持用户配置的 OpenAI provider。

---

## 四、架构缺失

### 4.1 Redis 已引入但完全未使用 `#11 ⬜`

`pyproject.toml` 中依赖 `redis[hiredis]>=5.0.0`，`config.py` 中配置了 Redis 连接参数，但 **整个后端没有任何代码实际连接或使用 Redis**。

**建议**: 要么实现计划中的缓存/会话存储功能，要么移除 Redis 依赖以减少部署复杂度。

---

### 4.2 无数据库迁移方案 `#12 ⬜`

**文件**: `main.py:16-17`

```python
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

使用 `create_all` 作为启动时的"开发便利"，但没有引入 Alembic 等迁移工具。在生产环境中，Model 变更将无法平滑迁移。

**建议**: 引入 Alembic，建立正式的数据库迁移流程。

---

### 4.3 WebSocket 无并发控制 `#14 ⬜`

WebSocket 端点没有实现：

- **速率限制**: 恶意客户端可以高频发送消息，导致大量 LLM API 调用
- **并发消息处理**: 如果用户快速发送多条 `sendMessage`，多个 orchestrator 会并行运行，可能导致资源耗尽
- **心跳超时**: 虽然实现了 `ping/pong`，但没有检测不活跃连接的超时机制

---

### 4.4 多 Agent 协作仅支持顺序执行 `#15 ⬜`

**文件**: `agents/orchestrator.py:382`

```python
for step_idx, step in enumerate(steps):
```

`_execute_plan` 严格顺序执行每个 step。如果步骤之间没有依赖关系（如 "前端专家写 CSS" 和 "后端专家写 API"），完全可以并行执行以大幅降低总耗时。

**建议**: 分析步骤间的依赖关系，无依赖的步骤使用 `asyncio.gather` 并行执行。

---

### 4.5 无多轮对话上下文传递 `#13 ⬜`

**文件**: `routes/websocket.py:94`

```python
async for event in orchestrator.process(session_id, content, agent_roster):
```

调用 `orchestrator.process` 时没有传递 `conversation_history`。虽然 orchestrator 接口支持该参数，但 WebSocket 路由从未构建历史上下文。这意味着每次对话都是单轮的，Agent 无法记住之前的交流内容。

**建议**: 在处理 `sendMessage` 时，从数据库查询该 session 的最近 N 条消息，构建 `conversation_history` 传给 orchestrator。

---

### 4.6 Codex 和 OpenCode 适配器是空壳 `#15 ⬜`

**文件**: `agents/providers/codex.py`、`agents/providers/opencode.py`

两个适配器都只返回静态 stub 响应。如果用户选择了这些适配器，会得到无意义的回复，且没有任何提示说明功能未实现。

**建议**: 要么实现这两个适配器，要么在注册表和前端中标记为 "coming soon" 并阻止选择。

---

## 五、代码质量改进建议

### 5.1 WebSocket 路由过于臃肿 `#16 ⬜`

`websocket.py` 的 `websocket_endpoint` 函数长达 ~250 行，承担了消息接收、验证、持久化、orchestrator 调用、事件转发、diff 应用等所有职责。

**建议**: 拆分为独立的 handler 函数：
- `_handle_send_message(db, session, websocket, payload, ...)`
- `_handle_trigger_action(db, session, websocket, payload, ...)`

---

### 5.2 自定义异常类应继承 HTTPException `#16 ⬜`

`DiffConflictError` 是普通 `Exception`，如果在 REST API 上下文中抛出，会返回 500 而非合适的 4xx 状态码。

---

### 5.3 list_users 缺乏分页 `#17 ⬜`

**文件**: `routes/users.py:16-19`

```python
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
```

`scalars().all()` 会将所有用户加载到内存中。当用户量增长时会导致性能问题。

**建议**: 添加 `limit`/`offset` 或 cursor 分页，与 `list_messages` 保持一致。

---

### 5.4 模型缺少数据库索引 `#18 ⬜`

当前没有任何额外索引。以下字段应添加索引以优化查询性能：

| 表 | 字段 | 原因 |
|---|---|---|
| `sessions` | `user_id` | `list_sessions` 按用户查询 |
| `messages` | `session_id` | `list_messages` 按会话查询 |
| `messages` | `(session_id, created_at)` | 游标分页复合查询 |
| `agent_profiles` | `user_id` | `list_agents` 按用户过滤 |

---

### 5.5 MCP 连接等待使用轮询而非 Event `#19 ⬜`

**文件**: `core/mcp_manager.py:137-140`

```python
for _ in range(200):
    if self._connected or self._bg_task.done():
        break
    await asyncio.sleep(0.1)
```

使用 200 次 100ms 轮询来等待连接完成。应使用 `asyncio.Event` 来实现更高效的等待。

---

### 5.6 配置中已声明但未使用的字段 `#11 ⬜`

`config.py` 中声明了 `REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD`、`REDIS_DB` 等字段，但由于 Redis 完全未使用，这些配置只是死代码。应清理或实现对应功能。

---

## 六、问题优先级汇总与修复跟踪

> **状态说明**: `⬜ 待修复` → `🔧 修复中` → `✅ 已修复` → `❌ 不修复（需说明原因）`

| # | 优先级 | 类别 | 问题 | 文件 | 状态 | 修复说明 |
|---|---|---|---|---|---|---|
| 1 | **P0** | 安全 | 硬编码数据库凭据 | `tests/conftest.py` | ⬜ 待修复 | |
| 2 | **P0** | 安全 | 无认证授权 | 全局 | ⬜ 待修复 | |
| 3 | **P0** | 安全 | API Key 泄露 | `schemas/agent.py` | ⬜ 待修复 | |
| 4 | **P0** | 安全 | triggerAction 缺乏权限校验 | `routes/websocket.py` | ⬜ 待修复 | |
| 5 | **P0** | 逻辑 | 差分引擎无法验证旧内容 | `core/diff_engine.py` | ⬜ 待修复 | |
| 6 | **P1** | 逻辑 | messageId 每 chunk 重新生成 | `routes/websocket.py` | ⬜ 待修复 | |
| 7 | **P1** | 逻辑 | cursor 分页基于非唯一字段 | `routes/messages.py` | ⬜ 待修复 | |
| 8 | **P1** | 逻辑 | create_user 无唯一性校验 | `routes/users.py` | ⬜ 待修复 | |
| 9 | **P1** | 逻辑 | 错误分类使用精确类型匹配 | `core/exception_handler.py` | ⬜ 待修复 | |
| 10 | **P1** | 逻辑 | updated_at 不自动更新 | `models/session.py` | ⬜ 待修复 | |
| 11 | **P2** | 架构 | Redis 未使用 | 全局 | ⬜ 待修复 | |
| 12 | **P2** | 架构 | 无数据库迁移工具 | `main.py` | ⬜ 待修复 | |
| 13 | **P2** | 架构 | 无多轮对话上下文 | `routes/websocket.py` | ⬜ 待修复 | |
| 14 | **P2** | 架构 | WebSocket 无并发控制 | `routes/websocket.py` | ⬜ 待修复 | |
| 15 | **P2** | 架构 | 多 Agent 仅顺序执行 | `agents/orchestrator.py` | ⬜ 待修复 | |
| 16 | **P3** | 质量 | WebSocket 路由过于臃肿 | `routes/websocket.py` | ⬜ 待修复 | |
| 17 | **P3** | 质量 | list_users 无分页 | `routes/users.py` | ⬜ 待修复 | |
| 18 | **P3** | 质量 | 缺少数据库索引 | `models/*.py` | ⬜ 待修复 | |
| 19 | **P3** | 质量 | MCP 连接使用轮询 | `core/mcp_manager.py` | ⬜ 待修复 | |
| 20 | **P3** | 质量 | WS Schema 未被使用 | `schemas/ws.py` | ⬜ 待修复 | |

### 修复进度统计

| 优先级 | 总数 | 已修复 | 待修复 | 不修复 |
|---|---|---|---|---|
| P0 (严重) | 5 | 0 | 5 | 0 |
| P1 (重要) | 5 | 0 | 5 | 0 |
| P2 (架构) | 5 | 0 | 5 | 0 |
| P3 (质量) | 5 | 0 | 5 | 0 |
| **合计** | **20** | **0** | **20** | **0** |

---

## 七、总结

项目架构设计合理，代码质量中上，但 **安全层面几乎空白**。在进行任何功能开发之前，应优先解决 P0 级别的安全问题（认证授权、凭据泄露、权限校验）。逻辑 Bug 方面，`messageId` 生成、游标分页、diff 验证是最需要立即修复的。架构层面，Redis 的引入时机过早，多轮对话和并发控制是功能完整性的关键缺失。
