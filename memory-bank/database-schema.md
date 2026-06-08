# AgentHub - 数据库设计文档

> 文档版本：v1.1
> 最后更新：2026-06-08
> 存储引擎：PostgreSQL 15+ / Redis 7+
> 迁移工具：Alembic（async 支持，基础设施已就绪，初始迁移尚未生成）

---

## 1. 存储选型与分工原则 (Storage Strategy)

### 1.1 双引擎分工矩阵

| 存储引擎 | 职责 | 数据特征 | 一致性要求 |
|----------|------|----------|------------|
| **PostgreSQL 15+** | 持久化结构数据 | 用户、会话、消息、Agent 元数据 | ACID 强一致 |
| **Redis 7+** | 高速缓存与状态机 | WS 连接状态、分布式锁、流式消息缓冲 | 最终一致 / 可丢失 |

### 1.2 PostgreSQL 职责边界

- 存储所有需要持久化的业务实体（`agent_profiles`、`sessions`、`messages`）
- 利用 `JSONB` 类型存储不规则的富媒体卡片数据（代码 Diff、网页预览、部署状态）
- 利用 `UUID[]` 数组类型存储群聊模式下的 Agent 参与列表
- 所有写操作必须走事务，确保消息与会话的引用完整性

### 1.3 Redis 职责边界

- **不存储任何需要持久化的业务数据**
- 仅作为运行时状态的高速缓存层
- 所有 Key 必须设置 TTL，防止内存泄漏
- 崩溃恢复后 Redis 数据可安全丢失，系统应能从 PostgreSQL 重建状态

---

## 2. PostgreSQL 实体表 DDL 详案 (Tables & Fields)

### 2.1 命名规范

| 层级 | 命名风格 | 示例 |
|------|----------|------|
| 数据库端 | snake_case | `session_id`、`created_at` |
| 前端契约 | camelCase | `sessionId`、`createdAt` |

> 字段映射由 ORM（SQLAlchemy）或 Pydantic 模型自动转换，严禁手写 SQL 时混用风格。

### 2.2 `users` 表

```sql
-- 用户账户表
CREATE TABLE users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    avatar        VARCHAR(512),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS '用户账户表';
COMMENT ON COLUMN users.id IS '主键，UUID v7（时间有序）';
COMMENT ON COLUMN users.username IS '用户名，唯一';
COMMENT ON COLUMN users.email IS '邮箱，唯一';
COMMENT ON COLUMN users.password_hash IS 'bcrypt 哈希后的密码';
COMMENT ON COLUMN users.avatar IS '头像 URL';
COMMENT ON COLUMN users.created_at IS '创建时间，UTC';
COMMENT ON COLUMN users.updated_at IS '最后更新时间，UTC';
```

### 2.3 `agent_profiles` 表

```sql
-- 智能体静态元数据表
CREATE TABLE agent_profiles (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         REFERENCES users(id) ON DELETE CASCADE,  -- null = 系统内置 Agent
    name          VARCHAR(100) NOT NULL,
    avatar        VARCHAR(512),
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('orchestrator', 'expert')),
    adapter_type  VARCHAR(50)  NOT NULL DEFAULT 'claude_code',  -- claude_code | codex | opencode | custom
    description   TEXT,
    system_prompt TEXT,
    agent_config  JSONB,        -- 自定义 Agent 配置（tools, skills, mcp 等）
    status        VARCHAR(20)  NOT NULL DEFAULT 'offline',  -- online | offline | busy | error
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_agent_profiles_user_id ON agent_profiles (user_id);

COMMENT ON TABLE agent_profiles IS '智能体静态元数据 + 运行时状态';
COMMENT ON COLUMN agent_profiles.id IS '主键，UUID v7（时间有序）';
COMMENT ON COLUMN agent_profiles.user_id IS '所属用户 ID，null 表示系统内置 Agent';
COMMENT ON COLUMN agent_profiles.name IS '智能体显示名称';
COMMENT ON COLUMN agent_profiles.avatar IS '头像 URL';
COMMENT ON COLUMN agent_profiles.role IS '角色类型：orchestrator=主编排器，expert=专家智能体';
COMMENT ON COLUMN agent_profiles.adapter_type IS '适配器类型：claude_code | codex | opencode | custom';
COMMENT ON COLUMN agent_profiles.description IS '能力描述，用于 Agent 市场展示';
COMMENT ON COLUMN agent_profiles.system_prompt IS '系统提示词，注入 LLM 上下文';
COMMENT ON COLUMN agent_profiles.agent_config IS '自定义 Agent 配置 JSONB（api_key, tools, skills, mcp）';
COMMENT ON COLUMN agent_profiles.status IS '运行时状态：offline/busy/online/error，WebSocket 生命周期自动管理';
COMMENT ON COLUMN agent_profiles.created_at IS '创建时间，UTC';
```

**`agent_profiles.status` 状态机**：
- `offline` → `busy`：用户发送消息时，参与的 Agent 被标记为 busy
- `busy` → `online`：Agent 执行完成
- `busy` → `error`：Agent 执行失败
- `busy`/`error` → `online`：WebSocket 断开连接时自动重置，防止状态卡死

### 2.4 `sessions` 表

```sql
-- IM 会话元数据表
CREATE TABLE sessions (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                VARCHAR(255) NOT NULL DEFAULT '新对话',
    type                 VARCHAR(10)  NOT NULL CHECK (type IN ('single', 'group')),
    agent_ids            UUID[]       NOT NULL DEFAULT '{}',
    is_pinned            BOOLEAN      NOT NULL DEFAULT FALSE,
    is_archived          BOOLEAN      NOT NULL DEFAULT FALSE,
    last_active_at       TIMESTAMPTZ,
    last_message_preview VARCHAR(200),
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_sessions_user_id ON sessions (user_id);

COMMENT ON TABLE sessions IS 'IM 会话元数据';
COMMENT ON COLUMN sessions.id IS '主键，UUID v7（时间有序）';
COMMENT ON COLUMN sessions.user_id IS '所属用户 ID，外键关联 users.id，级联删除';
COMMENT ON COLUMN sessions.title IS '会话标题，可由用户或 Orchestrator 自动命名';
COMMENT ON COLUMN sessions.type IS '会话类型：single=单聊，group=群聊';
COMMENT ON COLUMN sessions.agent_ids IS '参与的智能体 ID 数组，单聊时长度为1，群聊时包含 Orchestrator + 多个专家';
COMMENT ON COLUMN sessions.is_pinned IS '是否置顶，置顶会话在列表中优先显示';
COMMENT ON COLUMN sessions.is_archived IS '是否归档，归档会话默认不在列表中显示';
COMMENT ON COLUMN sessions.last_active_at IS '最后活跃时间，消息写入时自动刷新，用于排序';
COMMENT ON COLUMN sessions.last_message_preview IS '最后一条消息的前 200 字符预览，用于会话列表展示';
COMMENT ON COLUMN sessions.created_at IS '创建时间，UTC';
COMMENT ON COLUMN sessions.updated_at IS '最后更新时间，UTC，消息写入时自动刷新';
```

### 2.5 `messages` 表

```sql
-- 核心消息流表
CREATE TABLE messages (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID         NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    sender_type  VARCHAR(10)  NOT NULL CHECK (sender_type IN ('user', 'agent')),
    sender_id    VARCHAR(255) NOT NULL,
    content      TEXT         NOT NULL DEFAULT '',
    content_type VARCHAR(20)  NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'card')),
    card_data    JSONB,
    reply_to_id  UUID         REFERENCES messages(id) ON DELETE SET NULL,  -- 引用回复，自引用外键
    is_pinned    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_messages_session_id ON messages (session_id);

COMMENT ON TABLE messages IS '核心消息流表，存储所有对话消息';
COMMENT ON COLUMN messages.id IS '主键，UUID v7（时间有序）';
COMMENT ON COLUMN messages.session_id IS '外键，关联 sessions.id，级联删除';
COMMENT ON COLUMN messages.sender_type IS '发送者类型：user=用户，agent=智能体';
COMMENT ON COLUMN messages.sender_id IS '发送者 ID，user 时为用户 ID，agent 时为 agent_profiles.id';
COMMENT ON COLUMN messages.content IS '消息正文，text/markdown 时为纯文本，card 时为卡片标题或描述';
COMMENT ON COLUMN messages.content_type IS '内容类型：text=纯文本，markdown=富文本，card=结构化卡片';
COMMENT ON COLUMN messages.card_data IS '卡片数据 JSONB，当 content_type=card 时存储结构化产物';
COMMENT ON COLUMN messages.reply_to_id IS '引用回复的消息 ID，自引用外键，被引用消息删除时置 NULL';
COMMENT ON COLUMN messages.is_pinned IS '是否置顶/Pin，Pin 的消息在会话中高亮显示';
COMMENT ON COLUMN messages.created_at IS '创建时间，UTC';
```

### 2.6 `card_data` JSONB 结构规范

```jsonc
// content_type = "card" 时的 card_data 结构

// 代码 Diff 卡片
{
  "card_type": "code_diff",
  "filename": "src/components/Login.tsx",
  "language": "typescript",
  "additions": 42,
  "deletions": 8,
  "hunks": [
    {
      "oldStart": 12,
      "oldLines": 3,
      "newStart": 12,
      "newLines": 5,
      "content": "- // old code\n+ import { useAuth } from '@/hooks/useAuth';"
    }
  ],
  "status": "pending"  // pending | applied | rejected
}

// 网页预览卡片
{
  "card_type": "web_preview",
  "title": "Login Page",
  "html": "<div>...</div>",
  "css": "body { ... }",
  "js": "console.log('...')",
  "viewport": "desktop"  // mobile | tablet | desktop
}

// 部署状态卡片
{
  "card_type": "deploy_status",
  "status": "building",  // queued | building | deploying | live | failed
  "progress": 75,
  "preview_url": null,
  "logs": [
    { "timestamp": "2026-05-27T14:32:01Z", "level": "info", "message": "Building project..." }
  ]
}

// 错误卡片
{
  "card_type": "error",
  "error_code": "TIMEOUT",
  "error_message": "LLM request timed out after 30s",
  "recoverable": true
}
```

---

## 3. 高并发索引与性能优化规范 (Indexing & Performance)

### 3.1 索引清单

```sql
-- 会话历史消息按时间倒序翻页（IM 核心查询）
-- 覆盖查询：WHERE session_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?
CREATE INDEX ix_messages_session_created
    ON messages (session_id, created_at DESC);

-- 消息按 session_id 查询（ORM 反向引用常用）
CREATE INDEX ix_messages_session_id
    ON messages (session_id);

-- 富媒体卡片高速检索（GIN 索引）
-- 覆盖查询：WHERE card_data @> '{"card_type": "code_diff"}'
-- 覆盖查询：WHERE card_data @> '{"status": "live"}'
CREATE INDEX idx_messages_card_data
    ON messages USING GIN (card_data);

-- 会话按更新时间排序（会话列表页）
CREATE INDEX idx_sessions_updated_at
    ON sessions (updated_at DESC);

-- 会话按用户查询（多租户隔离）
CREATE INDEX ix_sessions_user_id
    ON sessions (user_id);

-- Agent 角色类型筛选（Agent 市场）
CREATE INDEX idx_agent_profiles_role
    ON agent_profiles (role);

-- Agent 按用户查询（用户自定义 Agent 列表）
CREATE INDEX ix_agent_profiles_user_id
    ON agent_profiles (user_id);
```

### 3.2 索引设计说明

| 索引名 | 类型 | 目标表 | 优化场景 |
|--------|------|--------|----------|
| `ix_messages_session_created` | B-Tree 复合 | `messages` | 会话内消息按时间倒序翻页，避免全表扫描 |
| `ix_messages_session_id` | B-Tree | `messages` | ORM 反向引用 + session_id 筛选 |
| `idx_messages_card_data` | GIN | `messages` | 按 `card_type`、`status` 等 JSONB 内部字段高速检索 |
| `idx_sessions_updated_at` | B-Tree | `sessions` | 会话列表按最近活跃排序 |
| `ix_sessions_user_id` | B-Tree | `sessions` | 多租户：按用户查询会话列表 |
| `idx_agent_profiles_role` | B-Tree | `agent_profiles` | Agent 市场按角色类型筛选 |
| `ix_agent_profiles_user_id` | B-Tree | `agent_profiles` | 按用户查询自定义 Agent |

### 3.3 性能优化策略

#### 消息翻页查询模式

```sql
-- 游标分页（推荐，性能稳定）
SELECT id, sender_type, sender_id, content, content_type, card_data, created_at
FROM messages
WHERE session_id = $1 AND created_at < $2
ORDER BY created_at DESC
LIMIT 50;

-- 避免 OFFSET 分页（数据量大时性能劣化）
-- SELECT ... FROM messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 50 OFFSET 1000; -- ❌
```

#### JSONB 查询示例

```sql
-- 查询某会话内所有代码 Diff 卡片
SELECT id, card_data
FROM messages
WHERE session_id = $1
  AND content_type = 'card'
  AND card_data @> '{"card_type": "code_diff"}';

-- 查询所有部署成功的预览链接
SELECT card_data->>'preview_url' AS preview_url
FROM messages
WHERE card_data @> '{"card_type": "deploy_status", "status": "live"}';
```

#### 自动更新 `updated_at` 触发器

```sql
-- sessions.updated_at 自动刷新
CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sessions SET updated_at = NOW() WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_update_session
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_session_timestamp();
```

---

## 4. Redis 键值设计定义 (Redis Key-Value Design)

### 4.1 命名规范

```
agenthub:{业务域}:{实体}:{标识符}
```

### 4.2 键值清单

| Key 模式 | 类型 | TTL | 用途 |
|----------|------|-----|------|
| `bl:{jti}` | STRING | token 剩余有效期 | Access Token 黑名单（logout 时写入） |
| `refresh:{user_id}` | STRING | 7天 | Refresh Token 存储（登录/刷新时覆盖） |
| `agenthub:ws:connection:{user_id}` | STRING | 60s | 在线用户 WebSocket 节点标识 |
| `agenthub:ws:session:{session_id}:users` | SET | 60s | 会话内在线用户集合 |
| `agenthub:lock:session:{session_id}` | STRING | 5s | 群聊模式 Orchestrator 调度锁 |
| `agenthub:stream:buffer:{session_id}:{message_id}` | LIST | 30s | 流式消息临时缓冲区 |
| `agenthub:rate_limit:{user_id}` | STRING | 60s | 用户级请求频率限制 |

### 4.3 键值详细设计

#### 4.3.1 WebSocket 连接状态

```
Key:    agenthub:ws:connection:{user_id}
Type:   STRING
Value:  {node_id}          # 当前用户连接的 WS 服务节点标识（多实例部署时使用）
TTL:    60s                 # 心跳感知周期，客户端每 30s 发送 ping，服务端续期
```

```
Key:    agenthub:ws:session:{session_id}:users
Type:   SET
Value:  {user_id_1, user_id_2, ...}
TTL:    60s                 # 最后一个用户离开后自动过期
```

**使用场景**：
- 用户连接 WS 时 `SET` 连接状态 + `SADD` 会话在线集合
- 用户断开时 `DEL` 连接状态 + `SREM` 会话在线集合
- 心跳 ping/pong 时 `EXPIRE` 续期 TTL

#### 4.3.2 分布式调度锁

```
Key:    agenthub:lock:session:{session_id}
Type:   STRING
Value:  {orchestrator_instance_id}
TTL:    5s                  # 自动释放，防止死锁
```

**使用场景**：
- 群聊模式下，Orchestrator 调度子 Agent 前获取锁
- 使用 `SET key value NX EX 5` 原子操作，防止多实例并发调度
- 任务完成后主动 `DEL`，或等待 TTL 自动释放

```python
# 获取锁
acquired = await redis.set(
    f"agenthub:lock:session:{session_id}",
    instance_id,
    nx=True,
    ex=5
)
if not acquired:
    raise ConcurrentDispatchError("Another orchestrator is processing")
```

#### 4.3.3 流式消息缓冲

```
Key:    agenthub:stream:buffer:{session_id}:{message_id}
Type:   LIST
Value:  [chunk_1, chunk_2, chunk_3, ...]
TTL:    30s                 # 消息完成后持久化到 PostgreSQL，缓冲自动过期
```

**使用场景**：
- Agent 流式输出时，将每个 chunk `RPUSH` 到缓冲区
- 前端通过 WS 实时接收 chunk
- 流结束后，后端将完整消息 `LPUSH` 取出并持久化到 `messages` 表
- 缓冲区在 TTL 后自动清理

#### 4.3.4 请求频率限制

```
Key:    agenthub:rate_limit:{user_id}
Type:   STRING (INCR 计数器)
Value:  {count}
TTL:    60s                 # 滑动窗口 60 秒
```

**使用场景**：
- 每次用户发送消息时 `INCR` 计数
- 超过阈值（如 60 次/分钟）时拒绝请求
- TTL 到期自动重置

```python
count = await redis.incr(f"agenthub:rate_limit:{user_id}")
if count == 1:
    await redis.expire(f"agenthub:rate_limit:{user_id}", 60)
if count > 60:
    raise RateLimitError("Too many requests")
```

### 4.4 Redis 与 PostgreSQL 数据流

```
用户发送消息
       │
       ▼
┌──────────────┐    ┌─────────────────────────────────┐
│   Redis      │    │   PostgreSQL                    │
│              │    │                                 │
│ 1. 频率检查  │    │                                 │
│    INCR      │    │                                 │
│              │    │                                 │
│ 2. 获取调度锁│    │                                 │
│    SET NX    │    │                                 │
│              │    │                                 │
│ 3. 流式缓冲  │    │                                 │
│    RPUSH     │    │                                 │
│              │    │                                 │
│ 4. 完成后 ──────────► 5. 持久化消息                 │
│    DEL 缓冲  │    │    INSERT INTO messages          │
│    DEL 锁    │    │                                 │
└──────────────┘    └─────────────────────────────────┘
```

---

## 附录：数据完整性约束检查清单

| 检查项 | 状态 |
|--------|------|
| `users` 表唯一约束（username, email） | ✅ `UNIQUE` |
| `sessions.user_id` 外键级联删除 | ✅ `ON DELETE CASCADE` |
| `agent_profiles.user_id` 外键级联删除 | ✅ `ON DELETE CASCADE` |
| `messages.session_id` 外键级联删除 | ✅ `ON DELETE CASCADE` |
| `messages.reply_to_id` 自引用外键 | ✅ `ON DELETE SET NULL` |
| `sender_type` 枚举约束 | ✅ `CHECK (sender_type IN ('user', 'agent'))` |
| `sessions.type` 枚举约束 | ✅ `CHECK (type IN ('single', 'group'))` |
| `agent_profiles.role` 枚举约束 | ✅ `CHECK (role IN ('orchestrator', 'expert'))` |
| `messages.content_type` 枚举约束 | ✅ `CHECK (content_type IN ('text', 'markdown', 'card'))` |
| `agent_profiles.status` 状态机 | ✅ offline/busy/online/error |
| 消息翻页复合索引 | ✅ `ix_messages_session_created` |
| JSONB GIN 索引 | ✅ `idx_messages_card_data` |
| 多租户用户索引 | ✅ `ix_sessions_user_id`, `ix_agent_profiles_user_id` |
| `sessions.updated_at` 自动更新触发器 | ✅ `trg_messages_update_session` |
| Token 黑名单 Redis Key | ✅ `bl:{jti}` TTL = 剩余有效期 |
| Refresh Token Redis Key | ✅ `refresh:{user_id}` TTL = 7天 |
| Redis 所有 Key 设置 TTL | ✅ 无永不过期 Key |
| Redis 分布式锁自动释放 | ✅ TTL 5s |
| Alembic 迁移基础设施 | ✅ 已就绪，初始迁移待生成 |
