# 契约层指南

本目录是 AgentHub 项目的**契约层（SSOT）**。它定义了前后端通信的唯一数据结构规范，确保双方始终对数据格式保持一致。

## 概览

```
shared/schemas/
  entities.json      -- 核心实体定义（AgentProfile, Session, Message 等）
  ws_messages.json   -- WebSocket 双向消息协议
  README.md          -- 本文件
```

所有 JSON 文件遵循 JSON Schema（draft-07）标准。字段名在线上统一使用 **camelCase**。

## entities.json -- 核心实体定义

定义以下核心实体的标准结构：

- **AgentProfile** -- Agent 身份信息，角色（`orchestrator` | `expert`），状态（`online` | `offline` | `busy` | `error`）
- **Session** -- 聊天会话，类型（`single` | `group`），关联的 Agent，置顶/归档标记，最后一条消息预览
- **Message** -- 聊天消息，发送者类型（`user` | `agent`），内容类型（`text` | `markdown` | `card`），`cardData`（代码块、diff 块、预览/部署块），`replyToId`，`isPinned`

### 命名规范

- JSON 线上格式：**camelCase**（例如 `sessionId`、`senderType`、`replyToId`）
- 后端 Pydantic 模型：内部使用 **snake_case**（例如 `session_id`、`sender_type`），通过 `alias_generator=_to_camel` + `populate_by_name=True` 进行转换
- 前端 TypeScript 类型：**camelCase**，通过 `pnpm codegen` 自动生成

### 如何添加新字段

1. 在 `entities.json` 中打开对应的实体定义
2. 在 `properties` 中添加字段，包括类型、描述和约束条件
3. 如果该字段是必填的，将其加入 `required` 数组
4. 然后按下方的工作流程更新后端和前端

## ws_messages.json -- WebSocket 协议

定义双向 WebSocket 消息协议，分为两类：

- **C2S（客户端到服务器）**：`ping`、`sendMessage`、`triggerAction`
- **S2C（服务器到客户端）**：`pong`、`agentStatus`、`messageChunk`、`messageComplete`、`error`、`actionStatus`、`actionResult`

每条消息都包含一个 `type` 类型标识符和一个 `timestamp` 时间戳字段。数据载荷嵌套在 `payload` 下。

完整的协议文档请参阅 [backend/docs/websocket.md](../../backend/docs/websocket.md)。

## 与后端 Pydantic 模型的关系

`entities.json` 中的每个实体在 `backend/app/schemas/` 中都有对应的 Pydantic 模型。这些模型使用以下配置：

```python
def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])

class SessionRead(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=_to_camel,
        populate_by_name=True,
    )
    session_id: UUID
    # ...
```

- `alias_generator=_to_camel` -- 自动生成 camelCase 别名用于 JSON 序列化
- `populate_by_name=True` -- 允许在反序列化时同时接受 snake_case 和 camelCase 字段名
- `from_attributes=True` -- 启用 `model_validate(orm_obj)` 从 SQLAlchemy 模型直接验证

## 与前端 TypeScript 类型的关系

前端类型由 JSON Schema 自动生成：

```bash
pnpm codegen
```

该命令运行 `json-schema-to-typescript`（或等效工具），在 `frontend/src/types/` 下生成 TypeScript 接口。生成的类型使用与线上格式一致的 camelCase 字段名。

## 添加新实体或新字段（分步指南）

### 为现有实体添加新字段

1. **更新 `entities.json`** -- 添加字段定义，包括类型、约束和描述
2. **更新后端 SQLAlchemy 模型** -- 在 `backend/app/models/` 中添加列
3. **更新后端 Pydantic Schema** -- 在 `backend/app/schemas/` 中的 `Read`、`Create`、`Update` 模型中添加该字段
4. **生成数据库迁移** -- `alembic revision --autogenerate -m "add field to entity"`
5. **重新生成前端类型** -- `pnpm codegen`
6. **更新前端组件** -- 在 UI 中使用新字段

### 添加新实体

1. **在 `entities.json` 中定义** -- 在 `$definitions` 下添加新的顶层条目
2. **创建 SQLAlchemy 模型** -- 在 `backend/app/models/` 下新建文件
3. **创建 Pydantic Schema** -- 在 `backend/app/schemas/` 下新建文件
4. **创建 API 路由** -- 在 `backend/app/routes/` 下新建文件
5. **生成数据库迁移** -- `alembic revision --autogenerate -m "add new entity"`
6. **重新生成前端类型** -- `pnpm codegen`

### 添加新的 WebSocket 消息类型

1. **在 `ws_messages.json` 中定义** -- 在 `$definitions` 下添加 C2S 或 S2C 定义
2. **更新后端 Pydantic 模型** -- 在 `backend/app/schemas/ws.py` 中添加
3. **更新 WebSocket 处理器** -- 在 `backend/app/routes/websocket.py` 中处理新类型
4. **重新生成前端类型** -- `pnpm codegen`

## 重要规则

1. **必须先更新 `shared/schemas/`**，然后再进行后端或前端的修改
2. **绝对不要凭记忆编写 REST 接口或 Pydantic Schema** -- 始终先阅读 JSON Schema 文件
3. **线上字段名始终使用 camelCase** -- 使用 alias generator，不要手动为每个字段设置别名
4. **所有实体保持 `additionalProperties: false`**，以便尽早发现拼写错误
