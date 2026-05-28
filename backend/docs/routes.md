# routes/ - API 路由

所有 REST 和 WebSocket 端点定义。REST 端点挂载在 `/api` 前缀下，WebSocket 在 `/ws`。

## 路由模块概览

| 文件 | 前缀 | 标签 | 说明 |
|------|------|------|------|
| `users.py` | `/api/users` | users | 用户 CRUD |
| `sessions.py` | `/api/users/{user_id}/sessions` | sessions | 会话 CRUD |
| `agents.py` | `/api/agents` | agents | 智能体 CRUD |
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

创建新用户。

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

更新会话标题。

**请求体**: `SessionUpdate`

```json
{"title": "新标题"}
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
ws://localhost:8000/ws?session_id={session_id}
```

连接时自动验证 `session_id` 格式和存在性，加载关联的智能体配置，创建 Orchestrator 实例。

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
{"type": "sendMessage", "payload": {"content": "帮我审查这段代码"}}
```

处理流程:
1. 保存用户消息到数据库
2. 通过 Orchestrator 分发给智能体
3. 流式返回 `agentStatus` 和 `messageChunk` 事件
4. 完成后保存智能体回复，发送 `messageComplete`

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

状态值: `analyzing` | `executing` | `completed` | `failed`

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
