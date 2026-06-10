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

## UI/UX 设计原则（严格遵循苹果极简风格）

- **核心理念**：少即是多。任何不服务于核心功能的元素都必须移除。克制是最高级的美感。
- **反 AI 默认审美规则**（极其重要，必须严格遵守）：
  - 绝对禁止使用霓虹渐变、发光效果或五颜六色的背景模糊。
  - 绝对禁止使用厚重的阴影。阴影必须极其微妙（如 `shadow-sm` 或 `rgba(0,0,0,0.05)`），若非必要，直接不用阴影。
  - 绝对禁止在同一行混合使用多种字重。除主标题外，避免滥用粗体。
  - 绝对禁止滥用大圆角。卡片使用微圆角（如 `rounded-lg`），禁止使用胶囊型（`rounded-full`）作为卡片样式。
  - 避免使用彩色图标。统一使用单色线条图标（stroke-width 设为 1.5），颜色跟随当前文本色。
  - 避免使用渐变色按钮。使用纯色、低饱和度的颜色（白、黑或浅灰）作为基底，配合克制的 hover 交互。

- **色彩体系**：
  - 背景：纯白（`#FFFFFF`）或极浅的灰色（`#F5F5F7`，极简风格标志性背景色）。
  - 主文本：接近纯黑（`#1D1D1F`），确保对比度但不要刺眼。
  - 辅助文本：浅灰色（`#86868B`），用于次要说明。
  - 强调色：仅使用一种强调色且极度克制（如蓝 `#0071E3`），仅用于主要操作按钮或关键链接。
  - 边框：极浅的灰色（`#D2D2D7` 或 `rgba(0,0,0,0.08)`），仅限 1px。能用留白分割就不要用边框。

- **排版体系**：
  - 字体：使用 Inter 或 SF Pro 风格的系统字体栈（`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`）。
  - 行高：宽松的行高（正文建议 1.5 - 1.6），让阅读有呼吸感。
  - 字间距：标题注意收紧字间距（如 `tracking-tight`），正文保持默认。
  - 段落间距：区块之间保留巨大的留白（如 `py-16` 到 `py-24`），不要让内容挤在一起。

- **布局与留白**：
  - 内容容器必须设置最大宽度并居中（如 `max-w-5xl mx-auto`），绝对不要让内容贴边或宽屏拉满。
  - 充足的内边距。留白本身就是一种设计元素，用留白来引导视觉，而不是用线条和色块。
  - 网格布局必须保持一致的间距（如 `gap-8` 或 `gap-12`），强调对齐与秩序感。

- **动效与交互**：
  - 微妙且迅速。统一使用 `transition-all duration-300 ease-in-out`。
  - 绝对禁止弹跳、旋转、或夸张的缩放动画。
  - 仅允许淡入和轻微的位移（如从 `translate-y-2` 到 `translate-y-0` 配合 opacity 变化）。