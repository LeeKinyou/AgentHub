# 变更日志

本项目的所有重要变更均记录在此文件中。

格式遵循 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) 规范。

## [Unreleased]

### Added

- Session 字段：`isPinned`、`isArchived`、`lastActiveAt`、`lastMessagePreview`，用于会话管理
- Message 字段：`replyToId`（回复引用支持）、`isPinned`（消息置顶）
- S2C 类型化 Pydantic 模型，覆盖所有 WebSocket 服务器到客户端消息（`S2CPong`、`S2CAgentStatus`、`S2CMessageChunk`、`S2CMessageComplete`、`S2CError`、`S2CActionStatus`、`S2CActionResult`）
- Agent 状态生命周期管理：`offline` -> `busy` -> `online`/`error`，支持数据库持久化
- WebSocket 断开连接清理：连接关闭时将卡在 `busy` 或 `error` 状态的 Agent 重置为 `online`
- Alembic 迁移基础设施（`alembic.ini`、`alembic/env.py`，支持异步 SQLAlchemy）
- 所有 Pydantic Schema 的 camelCase 别名配置（`alias_generator=_to_camel`、`populate_by_name=True`）
- `POST /api/users` 接口的 JWT 认证
- `MessageChunkPayload` 新增 `tool_status` 内容块类型，用于 MCP 工具执行状态
- 契约层文档（`shared/schemas/README.md`）
- WebSocket 协议文档（`backend/docs/websocket.md`）
- Alembic 迁移指南（`backend/docs/migrations.md`）
- 贡献指南（`CONTRIBUTING.md`）

### Fixed

- `replyToId` 外键校验：现在会在插入前验证被引用的消息是否存在于同一会话中
- `MessageChunkPayload` 的 `chunkType` 枚举中缺少 `tool_status` 类型
- S2C 消息现在使用类型化 Pydantic 模型配合 `model_dump(by_alias=True)` 来确保正确的 camelCase 线上格式，替代了之前的原始字典
- 编排器失败时的 Agent 状态转换：Agent 现在会被标记为 `error`，而不是卡在 `busy` 状态
