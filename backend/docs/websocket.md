# WebSocket 协议文档

AgentHub WebSocket 双向通信协议的完整参考文档。

## 连接

```
ws://localhost:8000/ws?session_id={session_id}&token={jwt_token}
```

### 参数

| 参数         | 类型   | 必填 | 说明                    |
| ------------ | ------ | ---- | ----------------------- |
| `session_id` | UUID   | 是   | 目标会话 ID             |
| `token`      | string | 是   | 用于认证的 JWT 访问令牌 |

### 认证

JWT 令牌需作为查询参数传递。服务器在接受连接前会验证令牌：

1. 解码并验证 JWT（HS256 签名，过期时间检查）
2. 检查 Redis 中的令牌黑名单（`bl:{jti}`）
3. 验证会话属于已认证的用户
4. 如果任一检查失败，连接将以状态码 `4003` 关闭

### 令牌撤销

令牌可通过 Redis 加入黑名单。服务器在每次连接时检查 `bl:{jti}`。登出操作通常会将当前令牌的 JTI 加入黑名单。

## 消息格式

所有消息（C2S 和 S2C）使用 JSON 格式，字段名采用 **camelCase**：

```json
{
  "type": "<message_type>",
  "timestamp": "2026-06-08T12:00:00Z",
  "payload": { ... }
}
```

- `type` -- 消息类型标识符（string，必填）
- `timestamp` -- ISO 8601 时间戳（string，必填）
- `payload` -- 与类型相关的数据（object，大多数类型必填）

## C2S 消息（客户端到服务器）

### 1. ping

心跳消息。服务器回复 `pong`。

```json
{
  "type": "ping",
  "timestamp": "2026-06-08T12:00:00Z"
}
```

### 2. sendMessage

向会话发送用户消息。触发 Agent 处理并返回流式响应。

```json
{
  "type": "sendMessage",
  "timestamp": "2026-06-08T12:00:00Z",
  "payload": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "content": "请帮我写一个 Python 快速排序",
    "replyToId": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

| 字段        | 类型   | 必填 | 说明                      |
| ----------- | ------ | ---- | ------------------------- |
| `sessionId` | UUID   | 是   | 目标会话 ID               |
| `content`   | string | 是   | 消息内容（1-50000 字符）  |
| `replyToId` | UUID   | 否   | 被回复消息的 ID           |

**处理流程：**
1. 速率限制检查（每秒 1 条消息）
2. 消息锁检查（同一时间只能处理一条消息）
3. 将用户消息持久化到数据库
4. 更新会话的 `lastActiveAt` 和 `lastMessagePreview`
5. 将参与的 Agent 标记为 `busy`
6. 通过 `messageChunk` 消息流式返回 Agent 响应
7. 完成后发送 `messageComplete`
8. 将 Agent 标记为 `online`（成功）或 `error`（失败）

### 3. triggerAction

对特定消息触发操作（例如应用代码 diff）。

```json
{
  "type": "triggerAction",
  "timestamp": "2026-06-08T12:00:00Z",
  "payload": {
    "messageId": "770e8400-e29b-41d4-a716-446655440002",
    "actionType": "applyDiff",
    "payload": {}
  }
}
```

| 字段         | 类型   | 必填 | 说明                                    |
| ------------ | ------ | ---- | --------------------------------------- |
| `messageId`  | UUID   | 是   | 包含操作的目标消息 ID                   |
| `actionType` | string | 是   | 操作类型：`applyDiff`、`retry`、`pin`   |
| `payload`    | object | 否   | 附加操作参数                            |

**处理流程：**
1. 验证消息是否存在于该会话中
2. 发送状态为 `applying` 的 `actionStatus`
3. 执行操作（例如将 diff 应用到文件）
4. 发送包含最终状态的 `actionResult`

## S2C 消息（服务器到客户端）

### 1. pong

对客户端 `ping` 的响应。

```json
{
  "type": "pong",
  "timestamp": "2026-06-08T12:00:01Z"
}
```

### 2. agentStatus

Agent 状态变更通知。当 Agent 在不同状态之间切换时发送。

```json
{
  "type": "agentStatus",
  "timestamp": "2026-06-08T12:00:02Z",
  "payload": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "agentId": "880e8400-e29b-41d4-a716-446655440003",
    "status": "analyzing",
    "displayText": "Agent is analyzing your request..."
  }
}
```

| 字段          | 类型   | 说明                                                              |
| ------------- | ------ | ----------------------------------------------------------------- |
| `sessionId`   | string | 会话上下文                                                        |
| `agentId`     | string | 报告状态的 Agent                                                  |
| `status`      | string | `analyzing` / `executing` / `completed` / `failed` / `online` / `offline` / `busy` / `error` |
| `displayText` | string | 可读的状态描述信息                                                |

**Agent 状态生命周期：**

```
offline --> busy (收到消息时)
busy --> online (成功时)
busy --> error (失败时)
```

WebSocket 断开连接后，会话中所有处于 `busy`/`error` 状态的 Agent 会被重置为 `online`。

### 3. messageChunk

Agent 返回的流式内容块。一条消息会发送多个内容块。

```json
{
  "type": "messageChunk",
  "timestamp": "2026-06-08T12:00:03Z",
  "payload": {
    "messageId": "990e8400-e29b-41d4-a716-446655440004",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "agentId": "880e8400-e29b-41d4-a716-446655440003",
    "chunkType": "text",
    "deltaContent": "Here is the quick sort implementation:\n",
    "chunkIndex": 0,
    "isFinal": false
  }
}
```

| 字段           | 类型    | 说明                                        |
| -------------- | ------- | ------------------------------------------- |
| `messageId`    | string  | 用于内容块组装的唯一消息 ID                 |
| `sessionId`    | string  | 会话上下文                                  |
| `agentId`      | string  | 生成此内容块的 Agent                        |
| `chunkType`    | string  | 内容类型：`text` / `code_diff` / `web_preview` / `deploy_status` / `tool_status` |
| `deltaContent` | string  | 此内容块的增量文本内容                      |
| `chunkIndex`   | integer | 从零开始的内容块序号                        |
| `isFinal`      | boolean | 是否为该消息的最后一个内容块                |

**内容块类型：**

- `text` -- 纯文本或 Markdown 内容
- `code_diff` -- 代码 diff 产物（渲染为 diff 查看器）
- `web_preview` -- 网页预览产物（在 iframe 沙箱中渲染）
- `deploy_status` -- 部署状态产物（进度条 + 日志）
- `tool_status` -- 工具执行状态（MCP 工具调用、文件操作）

### 4. messageComplete

当 Agent 完成一条完整消息的生成时发送。包含完整的 `Message` 实体。

```json
{
  "type": "messageComplete",
  "timestamp": "2026-06-08T12:00:10Z",
  "payload": {
    "id": "aa0e8400-e29b-41d4-a716-446655440005",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "senderType": "agent",
    "senderId": "880e8400-e29b-41d4-a716-446655440003",
    "content": "Here is the quick sort implementation:\n```python\ndef quicksort(arr):\n    ...\n```",
    "contentType": "text",
    "cardData": null,
    "replyToId": null,
    "isPinned": false,
    "createdAt": "2026-06-08T12:00:10Z"
  }
}
```

Payload 结构与 `entities.json` 中的 `Message` 实体一致。

### 5. error

错误通知。当操作失败时发送。

```json
{
  "type": "error",
  "timestamp": "2026-06-08T12:00:05Z",
  "payload": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "errorCode": "RATE_LIMITED",
    "errorMessage": "Too many messages, please slow down",
    "recoverable": true
  }
}
```

| 字段           | 类型    | 说明                        |
| -------------- | ------- | --------------------------- |
| `sessionId`    | string  | 发生错误的会话上下文        |
| `errorCode`    | string  | 机器可读的错误分类码        |
| `errorMessage` | string  | 人类可读的错误描述          |
| `recoverable`  | boolean | 客户端是否可以重试该操作    |

**错误码：**

| 错误码              | 说明                            | 可恢复 |
| ------------------- | ------------------------------- | ------ |
| `RATE_LIMITED`      | 消息过于频繁（1 秒 1 条限制）  | 是     |
| `BUSY`              | 上一条消息仍在处理中            | 是     |
| `PAYLOAD_TOO_LARGE` | 内容超过 50KB 限制              | 是     |
| `INVALID_MESSAGE`   | 未知或格式错误的消息类型        | 否     |
| `NOT_FOUND`         | 目标消息未找到                  | 否     |
| `INVALID_REQUEST`   | 无效的消息 ID 格式              | 否     |
| `UNSUPPORTED_ACTION`| 未知的操作类型                  | 否     |
| `NO_DIFF`           | 消息没有 diffBlock              | 否     |
| `INVALID_DIFF`      | DiffBlock 缺少文件名或 hunks    | 否     |
| `TIMEOUT`           | 请求或 LLM 调用超时             | 是     |
| `CONNECTION_ERROR`  | 网络连接失败                    | 是     |
| `AUTH_ERROR`        | LLM API 认证失败                | 否     |
| `UNKNOWN_ERROR`     | 未分类的内部错误                | 否     |

### 6. actionStatus

操作执行进度通知。

```json
{
  "type": "actionStatus",
  "timestamp": "2026-06-08T12:00:06Z",
  "payload": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "messageId": "770e8400-e29b-41d4-a716-446655440002",
    "actionType": "applyDiff",
    "status": "applying"
  }
}
```

| 字段         | 类型   | 说明                           |
| ------------ | ------ | ------------------------------ |
| `sessionId`  | string | 会话上下文                     |
| `messageId`  | string | 目标消息 ID                    |
| `actionType` | string | `applyDiff` / `retry` / `pin` |
| `status`     | string | `applying` / `pending`        |

### 7. actionResult

操作执行的最终结果。

```json
{
  "type": "actionResult",
  "timestamp": "2026-06-08T12:00:08Z",
  "payload": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "messageId": "770e8400-e29b-41d4-a716-446655440002",
    "actionType": "applyDiff",
    "status": "applied",
    "detail": "Successfully applied 3 hunks to src/main.py"
  }
}
```

| 字段         | 类型   | 说明                           |
| ------------ | ------ | ------------------------------ |
| `sessionId`  | string | 会话上下文                     |
| `messageId`  | string | 目标消息 ID                    |
| `actionType` | string | `applyDiff` / `retry` / `pin` |
| `status`     | string | `applied` / `rejected` / `failed` |
| `detail`     | string | 人类可读的结果详情             |

## 并发控制

### WebSocketSessionGuard

每个 WebSocket 连接都有一个 `WebSocketSessionGuard` 实例，负责强制执行以下规则：

- **速率限制**：消息之间至少间隔 1 秒（`check_rate_limit()`）
- **消息锁**：同一时间只能处理一条消息（`message_lock()`）
- **内容大小限制**：每条消息内容最大 50KB

当速率限制或锁检查失败时，服务器发送一条 `recoverable: true` 的 `error` 消息，连接保持不断开。

## 实现细节

### 后端 Schema

所有 S2C 消息使用类型化的 Pydantic 模型（而非原始字典），以确保正确的 camelCase 线上格式：

```python
# backend/app/schemas/ws.py
class S2CMessageChunk(BaseModel):
    model_config = ConfigDict(alias_generator=_to_camel, populate_by_name=True)
    type: Literal["messageChunk"] = "messageChunk"
    timestamp: str
    payload: MessageChunkPayload

# 使用别名进行序列化
msg.model_dump(mode="json", by_alias=True)
```

### Agent 状态生命周期

```
1. 用户发送消息
2. Agent 在数据库中被标记为 "busy"
3. AgentStatusEvent(status="analyzing") --> 发送 S2CAgentStatus
4. AgentStatusEvent(status="executing") --> 发送 S2CAgentStatus
5. 成功时：AgentStatusEvent(status="completed") --> Agent 在数据库中标记为 "online"
6. 失败时：AgentStatusEvent(status="failed") --> Agent 在数据库中标记为 "error"
7. 断开连接时：所有 busy/error 状态的 Agent 重置为 "online"
```

### 断开连接清理

当 WebSocket 断开连接（客户端关闭或网络中断）时：

1. 调用 `orchestrator.cleanup()` 取消所有正在执行的 Agent 工作
2. 会话中所有状态为 `busy` 或 `error` 的 Agent 在数据库中被重置为 `online`
3. 这避免了 Agent 卡在非工作状态的问题
