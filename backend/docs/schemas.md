# schemas/ - 数据校验 Schema

Pydantic v2 模型定义，用于请求体校验、响应序列化和 WebSocket 消息规范。

> **camelCase 别名**: 所有 Schema 均使用 `ConfigDict(alias_generator=_to_camel, populate_by_name=True)` 配置。线上 JSON 传输统一用 camelCase（如 `sessionId`、`agentId`），Python 内部用 snake_case。`populate_by_name=True` 允许同时接受两种命名。

## 模块列表

| 文件 | 职责 |
|------|------|
| `common.py` | 通用 API 响应封装 |
| `user.py` | 用户 CRUD Schema |
| `agent.py` | 智能体配置与 CRUD Schema |
| `session.py` | 会话 CRUD Schema |
| `message.py` | 消息 CRUD + 富内容卡片 Schema |
| `ws.py` | WebSocket 消息协议 Schema |

---

## common.py - ApiResponse

通用 API 响应封装，所有 REST 端点返回此格式。

```python
class ApiResponse(BaseModel, Generic[T]):
    code: int = 0          # 业务状态码 (0=成功, 非0=错误)
    data: T | None = None  # 响应数据
    message: str = "success"  # 状态消息
```

### 使用示例

```python
# 成功
ApiResponse(data=UserRead.model_validate(user))
# -> {"code": 0, "data": {...}, "message": "success"}

# 错误
ApiResponse(code=404, message="User not found")
# -> {"code": 404, "data": null, "message": "User not found"}
```

---

## user.py

### UserCreate

创建用户请求体。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | str | 是 | 用户名 |
| `email` | str \| None | 否 | 邮箱 |
| `avatar` | str \| None | 否 | 头像 URL |

### UserUpdate

更新用户请求体 (所有字段可选)。

| 字段 | 类型 | 说明 |
|------|------|------|
| `username` | str \| None | 用户名 |
| `email` | str \| None | 邮箱 |
| `avatar` | str \| None | 头像 URL |

### UserRead

用户响应体 (从 ORM 模型自动转换)。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 用户 ID |
| `username` | str | 用户名 |
| `email` | str \| None | 邮箱 |
| `avatar` | str \| None | 头像 URL |
| `created_at` | datetime | 创建时间 |

---

## agent.py

### AgentConfig

自定义智能体配置 (存储在 `agent_profile.agent_config` JSONB 中)。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `api_provider` | str | `"anthropic"` | API 提供商: `anthropic` / `openai` |
| `api_key` | str | `""` | API 密钥 |
| `base_url` | str | `""` | 自定义 Base URL (OpenAI 兼容) |
| `model` | str | `""` | 模型名称 |
| `system_prompt` | str \| None | None | 系统提示词 |
| `tools` | list[dict] | `[]` | 工具定义列表 |
| `skills` | list[str] | `[]` | 技能标签列表 |
| `mcp_servers` | list[dict] | `[]` | MCP 服务器配置列表 |

### AgentProfileCreate

创建智能体请求体。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | str | 是 | 智能体名称 |
| `role` | str | 是 | 角色: `orchestrator` / `expert` |
| `user_id` | UUID \| None | 否 | 所属用户 (NULL=系统智能体) |
| `avatar` | str \| None | 否 | 头像 |
| `adapter_type` | str | 否 | 适配器类型 (默认 `claude_code`) |
| `description` | str \| None | 否 | 描述 |
| `system_prompt` | str \| None | 否 | 系统提示词 |
| `agent_config` | AgentConfig \| None | 否 | 适配器配置 |

### AgentProfileUpdate

更新智能体请求体 (所有字段可选)。

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | str \| None | 名称 |
| `avatar` | str \| None | 头像 |
| `description` | str \| None | 描述 |
| `system_prompt` | str \| None | 系统提示词 |
| `agent_config` | AgentConfig \| None | 适配器配置 |

### AgentProfileRead

智能体响应体。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 智能体 ID |
| `user_id` | UUID \| None | 所属用户 |
| `name` | str | 名称 |
| `avatar` | str \| None | 头像 |
| `role` | str | 角色 |
| `adapter_type` | str | 适配器类型 |
| `description` | str \| None | 描述 |
| `system_prompt` | str \| None | 系统提示词 |
| `agent_config` | dict \| None | 适配器配置 (原始 dict) |

---

## session.py

### SessionCreate

创建会话请求体。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | str | 否 | `"新对话"` | 会话标题 |
| `type` | str | 是 | - | 类型: `single` / `group` |
| `agent_ids` | list[UUID] | 是 | - | 参与的智能体 ID 列表 |

### SessionUpdate

更新会话请求体。

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | str \| None | 会话标题 |
| `is_pinned` | bool \| None | 是否置顶 |
| `is_archived` | bool \| None | 是否归档 |

### SessionRead

会话响应体。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 会话 ID |
| `user_id` | UUID | 所属用户 |
| `title` | str | 标题 |
| `type` | str | 类型 |
| `agent_ids` | list[UUID] | 智能体 ID 列表 |
| `is_pinned` | bool | 是否置顶 (默认 False) |
| `is_archived` | bool | 是否归档 (默认 False) |
| `last_active_at` | datetime \| None | 最后活跃时间 |
| `last_message_preview` | str \| None | 最新消息预览 |
| `created_at` | datetime | 创建时间 |
| `updated_at` | datetime | 更新时间 |

---

## message.py

### DiffHunk

Diff 中的一个差异块。

| 字段 | 类型 | 说明 |
|------|------|------|
| `oldStart` | int | 原文件起始行 (1-based) |
| `oldLines` | int | 原文件替换行数 |
| `newStart` | int | 新文件起始行 |
| `newLines` | int | 新文件行数 |
| `content` | str | 替换内容 |

### CodeBlock

代码块卡片。

| 字段 | 类型 | 说明 |
|------|------|------|
| `language` | str | 编程语言 |
| `code` | str | 代码内容 |
| `title` | str | 标题 |

### DiffBlock

Diff 卡片。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `filename` | str | - | 文件路径 |
| `language` | str | - | 编程语言 |
| `additions` | int | - | 新增行数 |
| `deletions` | int | - | 删除行数 |
| `hunks` | list[DiffHunk] | - | 差异块列表 |
| `status` | str | `"pending"` | 状态: `pending` / `applied` / `rejected` |

### PreviewBlock

HTML 预览卡片。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `html` | str | - | HTML 内容 |
| `css` | str \| None | None | CSS 样式 |
| `js` | str \| None | None | JavaScript |
| `viewport` | str | `"desktop"` | 视口: `mobile` / `tablet` / `desktop` |

### DeployBlock

部署状态卡片。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `status` | str | - | 状态: `queued` / `building` / `deploying` / `live` / `failed` |
| `progress` | int | `0` | 进度百分比 |
| `previewUrl` | str \| None | None | 预览 URL |
| `logs` | list[DeployLogEntry] | `[]` | 日志条目 |

### CardData

卡片数据联合体，包含所有可能的卡片类型。

```python
class CardData(BaseModel):
    codeBlock: CodeBlock | None = None
    diffBlock: DiffBlock | None = None
    previewBlock: PreviewBlock | None = None
    deployBlock: DeployBlock | None = None
```

### MessageRead / MessageCreate

消息响应体和创建请求体。

#### MessageRead

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 消息 ID |
| `session_id` | UUID | 所属会话 |
| `sender_type` | str | 发送者类型 |
| `sender_id` | str | 发送者 ID |
| `content` | str | 消息内容 |
| `content_type` | str | 内容类型 |
| `card_data` | dict \| None | 富内容卡片数据 |
| `reply_to_id` | UUID \| None | 回复目标消息 ID |
| `is_pinned` | bool | 是否置顶 (默认 False) |
| `created_at` | datetime | 创建时间 |

---

## ws.py

WebSocket 消息协议 Schema。

### 客户端 -> 服务端

#### WSSendMessage

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | str | `"sendMessage"` |
| `timestamp` | str | ISO 时间戳 |
| `payload` | SendMessagePayload | 消息体 |

##### SendMessagePayload

| 字段 | 类型 | 说明 |
|------|------|------|
| `session_id` | UUID | 会话 ID |
| `content` | str | 消息内容 |
| `reply_to_id` | UUID \| None | 回复目标消息 ID (可选) |

#### WSTriggerAction

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | str | `"triggerAction"` |
| `message_id` | UUID | 目标消息 ID |
| `action_type` | str | 操作类型: `applyDiff` / `retry` / `pin` |
| `payload` | dict \| None | 附加数据 |

### 服务端 -> 客户端

#### WSAgentStatus

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | str | `"agentStatus"` |
| `session_id` | UUID | 会话 ID |
| `agent_id` | str | 智能体 ID |
| `status` | str | 状态: `analyzing` / `executing` / `completed` / `failed` |
| `display_text` | str | 显示文本 |

#### WSMessageChunk

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | str | `"messageChunk"` |
| `message_id` | str | 消息 ID |
| `session_id` | UUID | 会话 ID |
| `agent_id` | str | 智能体 ID |
| `chunk_type` | str | 块类型: `text` / `code_diff` / `web_preview` / `deploy_status` / `tool_status` |
| `delta_content` | str | 增量内容 |
| `chunk_index` | int | 块序号 |
| `is_final` | bool | 是否最后一块 |

#### WSError

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | str | `"error"` |
| `session_id` | str | 会话 ID |
| `error_code` | str | 错误码 |
| `error_message` | str | 错误消息 |
| `recoverable` | bool | 是否可恢复 |

### S2C 类型化 Payload 模型

服务端推送的每种消息类型都有独立的 Payload 模型和信封 (envelope) 模型，均使用 camelCase 别名。

#### Payload 模型

| 模型 | 用途 | 关键字段 |
|------|------|----------|
| `AgentStatusPayload` | 智能体状态变更 | `session_id`, `agent_id`, `status`, `display_text` |
| `MessageChunkPayload` | 流式消息块 | `message_id`, `session_id`, `agent_id`, `chunk_type`, `delta_content`, `chunk_index`, `is_final` |
| `MessageCompletePayload` | 消息完成 | `id`, `session_id`, `sender_type`, `sender_id`, `content`, `content_type`, `card_data`, `reply_to_id`, `is_pinned`, `created_at` |
| `ErrorPayload` | 错误通知 | `session_id`, `error_code`, `error_message`, `recoverable` |
| `ActionStatusPayload` | 操作状态 | `session_id`, `message_id`, `action_type`, `status` |
| `ActionResultPayload` | 操作结果 | `session_id`, `message_id`, `action_type`, `status`, `detail` |

#### 信封模型

每个 Payload 都有对应的信封包装：`S2CAgentStatus`, `S2CMessageChunk`, `S2CMessageComplete`, `S2CError`, `S2CActionStatus`, `S2CActionResult`，加上 `S2CPong` 共 7 个 S2C 信封类型。

联合类型: `S2CMessage = Union[S2CPong, S2CAgentStatus, S2CMessageChunk, S2CMessageComplete, S2CError, S2CActionStatus, S2CActionResult]`

#### AgentStatusPayload.status 枚举

`analyzing` | `executing` | `completed` | `failed` | `online` | `offline` | `busy` | `error`

#### MessageChunkPayload.chunk_type 枚举

`text` | `code_diff` | `web_preview` | `deploy_status` | `tool_status`

#### ActionStatusPayload.status 枚举

`applying` | `pending`

#### ActionResultPayload.status 枚举

`applied` | `rejected` | `failed`
