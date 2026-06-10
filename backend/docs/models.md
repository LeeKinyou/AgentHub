# models/ - 数据库模型

SQLAlchemy ORM 模型定义，使用 PostgreSQL 特有类型 (UUID, ARRAY) 和通用 JSON 类型。

所有模型使用 UUID7 作为主键 (`uuid6.uuid7`)，提供时间有序的唯一标识符。

## ER 关系图

```
┌──────────┐     1:N     ┌───────────────┐     1:N     ┌──────────┐
│   User   │────────────▶│    Session    │────────────▶│  Message │
└──────────┘             └───────────────┘             └──────────┘
     │                         │                          │    ▲
     │ 1:N                     │ N:M (via agent_ids)      │    │
     ▼                         │                          │ 1:N│
┌───────────────┐              │                          │(self-ref
│ AgentProfile  │◀─────────────┘                          │ FK) │
└───────────────┘                                         └────┘
```

---

## User (`user.py`)

用户模型。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK, default=uuid7 | 用户唯一标识 |
| `username` | String(50) | UNIQUE, NOT NULL | 用户名 |
| `email` | String(255) | UNIQUE, NOT NULL | 邮箱 |
| `password_hash` | String(128) | NOT NULL | 密码哈希 (bcrypt) |
| `avatar` | String(512) | NULLABLE | 头像 URL |
| `created_at` | DateTime(tz) | server_default=now() | 创建时间 |
| `updated_at` | DateTime(tz) | server_default=now(), onupdate=now() | 更新时间 |

### 表名: `users`

```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

---

## AgentProfile (`agent_profile.py`)

智能体配置模型。支持系统级智能体 (`user_id = NULL`) 和用户自定义智能体。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK, default=uuid7 | 智能体唯一标识 |
| `user_id` | UUID | FK(users.id), NULLABLE | 所属用户 (NULL=系统智能体) |
| `name` | String(100) | NOT NULL | 智能体名称 |
| `avatar` | String(512) | NULLABLE | 头像 URL |
| `role` | String(20) | NOT NULL | 角色: `orchestrator` / `expert` |
| `adapter_type` | String(50) | NOT NULL, default="claude_code" | 适配器类型 |
| `description` | Text | NULLABLE | 智能体描述 |
| `system_prompt` | Text | NULLABLE | 系统提示词 |
| `agent_config` | JSON | NULLABLE | 适配器配置 (tools, skills, mcp_servers) |
| `status` | String(20) | NOT NULL, default="offline" | 状态: `online` / `offline` / `busy` / `error` |
| `created_at` | DateTime(tz) | server_default=now() | 创建时间 |

### 表名: `agent_profiles`

### agent_config JSON 结构

```json
{
    "api_provider": "anthropic",
    "api_key": "sk-ant-...",
    "base_url": "",
    "model": "claude-sonnet-4-20250514",
    "system_prompt": "You are a helpful coding assistant.",
    "tools": [
        {"type": "function", "function": {"name": "...", "parameters": {...}}}
    ],
    "skills": ["code_review", "refactoring"],
    "mcp_servers": [
        {"name": "filesystem", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem"]}
    ]
}
```

### 适配器类型

| adapter_type | 说明 |
|-------------|------|
| `claude_code` | Anthropic Claude API |
| `codex` | Codex API (预留) |
| `opencode` | OpenCode API (预留) |
| `custom` | 自定义 (支持 Anthropic/OpenAI + MCP) |

---

## Session (`session.py`)

会话模型，代表一个用户与智能体的对话。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK, default=uuid7 | 会话唯一标识 |
| `user_id` | UUID | FK(users.id), CASCADE | 所属用户 |
| `title` | String(255) | NOT NULL, default="新对话" | 会话标题 |
| `type` | String(10) | NOT NULL | 类型: `single` / `group` |
| `agent_ids` | ARRAY(UUID) | NOT NULL, default=[] | 参与的智能体 ID 列表 |
| `is_pinned` | Boolean | NOT NULL, default=False | 是否置顶 |
| `is_archived` | Boolean | NOT NULL, default=False | 是否归档 |
| `last_active_at` | DateTime(tz) | NULLABLE | 最后活跃时间 (消息收发时自动更新) |
| `last_message_preview` | String(200) | NULLABLE | 最新消息预览 (截取前 200 字符) |
| `created_at` | DateTime(tz) | server_default=now() | 创建时间 |
| `updated_at` | DateTime(tz) | server_default=now(), onupdate=now() | 更新时间 |

### 表名: `sessions`

### 关键设计

- `agent_ids` 使用 PostgreSQL `ARRAY` 类型，存储参与会话的智能体 UUID 列表
- `type` 区分单智能体 (`single`) 和多智能体协作 (`group`) 会话
- `is_pinned` 用于会话置顶功能
- `is_archived` 用于会话归档（软隐藏）
- `last_active_at` 和 `last_message_preview` 在每次消息收发时自动更新，用于会话列表展示
- `updated_at` 在每次更新时自动刷新
- 删除用户时级联删除其所有会话

---

## Message (`message.py`)

消息模型，存储会话中的所有消息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK, default=uuid7 | 消息唯一标识 |
| `session_id` | UUID | FK(sessions.id), CASCADE | 所属会话 |
| `sender_type` | String(10) | NOT NULL | 发送者类型: `user` / `agent` |
| `sender_id` | String(255) | NOT NULL | 发送者 ID |
| `content` | Text | NOT NULL, default="" | 消息文本内容 |
| `content_type` | String(20) | NOT NULL, default="text" | 内容类型 |
| `card_data` | JSON | NULLABLE | 富内容卡片数据 |
| `reply_to_id` | UUID | FK(messages.id), SET NULL, NULLABLE | 回复目标消息 ID (自引用) |
| `is_pinned` | Boolean | NOT NULL, default=False | 是否置顶 |
| `created_at` | DateTime(tz) | server_default=now() | 创建时间 |

### 表名: `messages`

### 关键设计

- `reply_to_id` 是自引用外键，指向同表的 `messages.id`，删除被引用消息时置为 NULL (`SET NULL`)
- `is_pinned` 用于消息置顶功能
- 删除会话时级联删除其所有消息

### content_type 枚举

| 值 | 说明 |
|---|------|
| `text` | 纯文本 |
| `markdown` | Markdown 格式 |
| `card` | 富内容卡片 (代码块、Diff、预览等) |

### card_data JSON 结构

`card_data` 根据 `content_type` 包含不同结构:

#### CodeBlock (代码块)

```json
{
    "codeBlock": {
        "language": "python",
        "code": "print('hello')",
        "title": "示例代码"
    }
}
```

#### DiffBlock (代码差异)

```json
{
    "diffBlock": {
        "filename": "src/main.py",
        "language": "python",
        "additions": 5,
        "deletions": 3,
        "status": "pending",
        "hunks": [
            {"oldStart": 10, "oldLines": 3, "newStart": 10, "newLines": 5, "content": "..."}
        ]
    }
}
```

#### PreviewBlock (预览)

```json
{
    "previewBlock": {
        "html": "<div>...</div>",
        "css": "body { margin: 0; }",
        "js": "console.log('hi')",
        "viewport": "desktop"
    }
}
```

#### DeployBlock (部署)

```json
{
    "deployBlock": {
        "status": "building",
        "progress": 60,
        "previewUrl": "https://preview.example.com",
        "logs": [
            {"timestamp": "2026-05-28T12:00:00Z", "level": "info", "message": "Building..."}
        ]
    }
}
```
