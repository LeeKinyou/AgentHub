# models/ - 数据库模型

SQLAlchemy ORM 模型定义，使用 PostgreSQL 特有类型 (UUID, JSONB, ARRAY)。

所有模型使用 UUID7 作为主键 (`uuid6.uuid7`)，提供时间有序的唯一标识符。

## ER 关系图

```
┌──────────┐     1:N     ┌───────────────┐     1:N     ┌──────────┐
│   User   │────────────▶│    Session    │────────────▶│  Message │
└──────────┘             └───────────────┘             └──────────┘
     │                         │
     │ 1:N                     │ N:M (via agent_ids)
     ▼                         │
┌───────────────┐              │
│ AgentProfile  │◀─────────────┘
└───────────────┘
```

---

## User (`user.py`)

用户模型。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK, default=uuid7 | 用户唯一标识 |
| `username` | String(100) | UNIQUE, NOT NULL | 用户名 |
| `email` | String(255) | UNIQUE, NULLABLE | 邮箱 |
| `avatar` | String(512) | NULLABLE | 头像 URL |
| `created_at` | DateTime(tz) | server_default=now() | 创建时间 |

### 表名: `users`

```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    avatar: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
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
| `agent_config` | JSONB | NULLABLE | 适配器配置 (tools, skills, mcp_servers) |
| `created_at` | DateTime(tz) | server_default=now() | 创建时间 |

### 表名: `agent_profiles`

### agent_config JSONB 结构

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
| `created_at` | DateTime(tz) | server_default=now() | 创建时间 |
| `updated_at` | DateTime(tz) | server_default=now(), onupdate=now() | 更新时间 |

### 表名: `sessions`

### 关键设计

- `agent_ids` 使用 PostgreSQL `ARRAY` 类型，存储参与会话的智能体 UUID 列表
- `type` 区分单智能体 (`single`) 和多智能体协作 (`group`) 会话
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
| `card_data` | JSONB | NULLABLE | 富内容卡片数据 |
| `created_at` | DateTime(tz) | server_default=now() | 创建时间 |

### 表名: `messages`

### content_type 枚举

| 值 | 说明 |
|---|------|
| `text` | 纯文本 |
| `markdown` | Markdown 格式 |
| `card` | 富内容卡片 (代码块、Diff、预览等) |

### card_data JSONB 结构

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
