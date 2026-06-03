# AgentHub 项目规范

## 前后端契约

前后端交接的 SSOT 在 `shared/schemas/` 下：
- `entities.json` — 核心实体定义（AgentProfile, Session, Message 等）
- `ws_messages.json` — WebSocket 双向消息协议

### 硬性规则

1. **写 REST 接口或 Pydantic Schema 之前**，必须先读 `shared/schemas/entities.json`，确保字段名、类型、枚举值与契约一致
2. **写 WebSocket 消息处理之前**，必须先读 `shared/schemas/ws_messages.json`，确保消息类型和 payload 结构与契约一致
3. **字段命名**：线上 JSON 传输统一用 camelCase（如 `sessionId`、`agentId`），Pydantic 模型内部用 snake_case，通过 `model_config = ConfigDict(alias_generator=to_camel)` 或 `Field(alias=...)` 做转换
4. **新增或修改实体字段时**，先改 `shared/schemas/`，再改后端实现，不要反过来
5. **不要凭记忆写接口**，每次都要实际读文件确认

## 项目结构

- `shared/` — 契约层（SSOT），零依赖
- `frontend/` — 展现层，只依赖 `shared/`
- `backend/` — 服务层，通过同步脚本依赖 `shared/`

## 后端技术栈

- FastAPI + Pydantic v2
- LangGraph（Agent 编排）
- SQLAlchemy（ORM）
