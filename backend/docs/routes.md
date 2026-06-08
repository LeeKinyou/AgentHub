# routes/ - API 路由

所有 REST 和 WebSocket 端点定义。REST 端点挂载在 `/api` 前缀下，WebSocket 在 `/ws`。

## 路由模块概览

| 文件 | 前缀 | 标签 | 说明 |
|------|------|------|------|
| `users.py` | `/api/users` | users | 用户 CRUD |
| `sessions.py` | `/api/users/{user_id}/sessions` | sessions | 会话 CRUD |
| `agents.py` | `/api/agents` | agents | 智能体 CRUD |
| `auth.py` | `/api/auth` | auth | 认证 (注册/登录/刷新/登出) |
| `messages.py` | `/api/sessions/{session_id}/messages` | messages | 消息查询 |
| `websocket.py` | `/ws` | websocket | 实时通信 |

---

## users.py - 用户管理

### GET `/api/users`

获取所有用户列表。

**响应**: `ApiResponse[list[UserRead]]`

```json
{
    "code": 0,
    "data": [
        {"id": "...", "username": "alice", "email": "alice@example.com", "avatar": null, "created_at": "..."}
    ],
    "message": "success"
}
```

### POST `/api/users`

创建新用户 (需要认证)。

**请求体**: `UserCreate`

```json
{"username": "alice", "email": "alice@example.com", "avatar": "https://..."}
```

**响应**: `ApiResponse[UserRead]`

### GET `/api/users/{user_id}`

获取指定用户详情。

**响应**: `ApiResponse[UserRead]` | `ApiResponse(code=404)`

### PATCH `/api/users/{user_id}`

更新用户信息 (部分更新)。

**请求体**: `UserUpdate`

```json
{"username": "new_name"}
```

**响应**: `ApiResponse[UserRead]` | `ApiResponse(code=404)`

### DELETE `/api/users/{user_id}`

删除用户。

**响应**: `ApiResponse(message="deleted")` | `ApiResponse(code=404)`

---

## auth.py - 认证管理

JWT 认证流程，使用 bcrypt 密码哈希和 Redis token 黑名单。

### POST `/api/auth/register`

注册新用户并返回 token 对。

**请求体**: `RegisterRequest`

```json
{"username": "alice", "email": "alice@example.com", "password": "securepassword"}
```

**响应**: `ApiResponse[TokenResponse]`

```json
{
    "code": 0,
    "data": {
        "access_token": "eyJ...",
        "refresh_token": "eyJ...",
        "user": {"id": "...", "username": "alice", ...}
    }
}
```

**错误**: `ApiResponse(code=409)` — 用户名或邮箱已存在

### POST `/api/auth/login`

用户登录，验证凭据后返回 token 对。

**请求体**: `LoginRequest`

```json
{"username": "alice", "password": "securepassword"}
```

**响应**: `ApiResponse[TokenResponse]`

**错误**: `ApiResponse(code=401)` — 用户名或密码错误

### POST `/api/auth/refresh`

使用 refresh token 获取新的 access token 和 refresh token。

**请求体**: `RefreshRequest`

```json
{"refresh_token": "eyJ..."}
```

**响应**: `ApiResponse[TokenResponse]`

**错误**: `HTTP 401` — refresh token 无效或已过期

### POST `/api/auth/logout`

登出当前用户。将 access token 加入 Redis 黑名单，删除 refresh token。

**认证**: 需要 Bearer token

**响应**: `ApiResponse(message="Logged out")`

### GET `/api/auth/me`

获取当前认证用户信息。

**认证**: 需要 Bearer token

**响应**: `ApiResponse[UserRead]`

---

## sessions.py - 会话管理

所有会话操作都通过 `user_id` 路径参数限定作用域。

### GET `/api/users/{user_id}/sessions`

获取指定用户的所有会话，按 `updated_at` 降序排列。

**响应**: `ApiResponse[list[SessionRead]]`

### POST `/api/users/{user_id}/sessions`

为指定用户创建新会话。

**请求体**: `SessionCreate`

```json
{
    "title": "代码审查",
    "type": "single",
    "agent_ids": ["agent-uuid-1"]
}
```

**响应**: `ApiResponse[SessionRead]`

### GET `/api/users/{user_id}/sessions/{session_id}`

获取会话详情 (验证归属)。

**响应**: `ApiResponse[SessionRead]` | `ApiResponse(code=404)`

### PATCH `/api/users/{user_id}/sessions/{session_id}`

更新会话信息 (部分更新)。

**请求体**: `SessionUpdate`

```json
{"title": "新标题", "isPinned": true, "isArchived": false}
```

**响应**: `ApiResponse[SessionRead]` | `ApiResponse(code=404)`

### DELETE `/api/users/{user_id}/sessions/{session_id}`

删除会话 (级联删除关联消息)。

**响应**: `ApiResponse(message="deleted")` | `ApiResponse(code=404)`

---

## agents.py - 智能体管理

### GET `/api/agents`

获取智能体列表。

**查询参数**:
- `user_id` (可选, UUID) — 过滤: 返回系统智能体 (`user_id=NULL`) + 指定用户的智能体

**响应**: `ApiResponse[list[AgentProfileRead]]`

### GET `/api/agents/{agent_id}`

获取指定智能体详情。

**响应**: `ApiResponse[AgentProfileRead]` | `ApiResponse(code=404)`

### POST `/api/agents`

创建新智能体。

**请求体**: `AgentProfileCreate`

```json
{
    "name": "Code Reviewer",
    "role": "expert",
    "adapter_type": "custom",
    "description": "代码审查专家",
    "system_prompt": "You are a code review expert.",
    "agent_config": {
        "api_provider": "anthropic",
        "api_key": "sk-ant-...",
        "model": "claude-sonnet-4-20250514",
        "tools": [],
        "skills": ["code_review"],
        "mcp_servers": [
            {"name": "fs", "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem"]}
        ]
    }
}
```

**响应**: `ApiResponse[AgentProfileRead]`

### PATCH `/api/agents/{agent_id}`

更新智能体配置 (部分更新)。

**请求体**: `AgentProfileUpdate`

**响应**: `ApiResponse[AgentProfileRead]` | `ApiResponse(code=404)`

### DELETE `/api/agents/{agent_id}`

删除智能体。

**响应**: `ApiResponse(message="deleted")` | `ApiResponse(code=404)`

---

## messages.py - 消息查询

只读接口，消息在 WebSocket 会话中自动创建。

### GET `/api/sessions/{session_id}/messages`

获取会话消息列表，游标分页。

**查询参数**:
- `cursor` (可选, str) — 消息 ID，返回此消息之前的消息
- `limit` (可选, int, 1-100, 默认 50) — 每页数量

**响应**: `ApiResponse[list[MessageRead]]`

```json
{
    "code": 0,
    "data": [
        {
            "id": "...",
            "session_id": "...",
            "sender_type": "user",
            "sender_id": "user",
            "content": "你好",
            "content_type": "text",
            "card_data": null,
            "created_at": "..."
        },
        {
            "id": "...",
            "session_id": "...",
            "sender_type": "agent",
            "sender_id": "agent-uuid",
            "content": "你好！有什么可以帮助你的？",
            "content_type": "text",
            "card_data": null,
            "created_at": "..."
        }
    ],
    "message": "success"
}
```

---

## websocket.py - WebSocket 通信

### 连接

```
ws://localhost:8000/ws?session_id={session_id}&token={access_token}
```

**认证**: 必须通过 `token` 查询参数传递 JWT access token。连接建立前验证:
1. token 是否存在（缺失则关闭 4003）
2. token 签名和过期时间（无效则关闭 4003）
3. token 是否在 Redis 黑名单中（已撤销则关闭 4003）
4. `session_id` 对应的会话是否属于该用户（不匹配则关闭 4003）

连接建立后自动验证 `session_id` 格式和存在性，加载关联的智能体配置，解密 `api_key`，创建 Orchestrator 实例。

### 智能体状态生命周期

```
                    ┌─────────┐
    sendMessage ───▶│  busy   │◀─── 参与消息处理的智能体
                    └────┬────┘
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ completed│  │  failed  │  │  error   │
     └────┬─────┘  └────┬─────┘  └────┬─────┘
          │              │              │
          ▼              ▼              ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │  online  │  │  error   │  │  error   │
     └──────────┘  └──────────┘  └──────────┘
```

- **busy** — 智能体参与消息处理前设置
- **completed -> online** — 正常完成
- **failed -> error** — 处理失败
- **error** — Orchestrator 异常时设置

### 断开连接清理

WebSocket 断开时（正常断开或异常），在 `finally` 块中:
1. 调用 `orchestrator.cleanup()` 释放资源
2. 将所有 `busy` 或 `error` 状态的参与智能体重置为 `online`，防止状态卡死

### 消息类型

#### ping (客户端 -> 服务端)

```json
{"type": "ping", "timestamp": "2026-05-28T12:00:00Z"}
```

响应:
```json
{"type": "pong", "timestamp": "2026-05-28T12:00:00Z"}
```

#### sendMessage (客户端 -> 服务端)

发送用户消息，触发智能体处理。

```json
{"type": "sendMessage", "timestamp": "...", "payload": {"content": "帮我审查这段代码", "replyToId": "message-uuid"}}
```

**payload 字段**:
- `content` (必填) — 消息内容
- `replyToId` (可选) — 回复目标消息 ID，会验证该消息是否存在于当前会话

**速率限制**: 每次发送间隔不少于 1 秒，同一时间只能处理一条消息。

处理流程:
1. 速率限制和并发检查
2. 保存用户消息到数据库（含 `reply_to_id`）
3. 更新会话 `last_active_at` 和 `last_message_preview`
4. 将参与的智能体状态设为 `busy`
5. 构建历史对话上下文，通过 Orchestrator 分发给智能体
6. 流式返回 `agentStatus` 和 `messageChunk` 事件
7. 完成后保存智能体回复，更新会话，发送 `messageComplete`
8. 将智能体状态更新为 `online`（成功）或 `error`（失败）

#### triggerAction (客户端 -> 服务端)

触发消息关联的操作。

```json
{
    "type": "triggerAction",
    "payload": {
        "actionType": "applyDiff",
        "messageId": "message-uuid"
    }
}
```

支持的操作:
- `applyDiff` — 将消息 `card_data.diffBlock` 中的差异应用到文件

处理流程:
1. 验证 `messageId` 格式和存在性
2. 提取 `card_data.diffBlock`
3. 发送 `actionStatus: applying`
4. 调用 `diff_engine.apply_diff_to_file()`
5. 更新消息 `card_data.diffBlock.status`
6. 发送 `actionResult`

### 服务端推送事件

#### agentStatus

智能体状态变更。

```json
{
    "type": "agentStatus",
    "timestamp": "...",
    "payload": {
        "sessionId": "...",
        "agentId": "...",
        "status": "executing",
        "displayText": "Code Reviewer is working..."
    }
}
```

状态值: `analyzing` | `executing` | `completed` | `failed` | `online` | `offline` | `busy` | `error`

#### messageChunk

流式消息块。

```json
{
    "type": "messageChunk",
    "timestamp": "",
    "payload": {
        "messageId": "...",
        "sessionId": "...",
        "agentId": "...",
        "chunkType": "text",
        "deltaContent": "你好",
        "chunkIndex": 0,
        "isFinal": false
    }
}
```

chunkType: `text` | `code_diff` | `web_preview` | `deploy_status` | `tool_status`

#### messageComplete

消息完成。

```json
{
    "type": "messageComplete",
    "timestamp": "",
    "payload": {
        "id": "message-uuid",
        "sessionId": "...",
        "senderType": "agent",
        "senderId": "agent-uuid",
        "content": "完整回复内容...",
        "contentType": "text",
        "replyToId": null,
        "isPinned": false,
        "createdAt": ""
    }
}
```

#### actionResult

操作执行结果。

```json
{
    "type": "actionResult",
    "timestamp": "...",
    "payload": {
        "sessionId": "...",
        "messageId": "...",
        "actionType": "applyDiff",
        "status": "applied",
        "detail": "Applied 2 hunk(s) to src/main.py"
    }
}
```

status: `applied` | `rejected`

#### error

错误通知。

```json
{
    "type": "error",
    "timestamp": "...",
    "payload": {
        "sessionId": "...",
        "errorCode": "INVALID_REQUEST",
        "errorMessage": "Invalid session_id format",
        "recoverable": false
    }
}
```
