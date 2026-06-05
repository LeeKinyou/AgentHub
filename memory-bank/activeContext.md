# AgentHub - 当前开发聚焦与上下文

> 最后更新：2026-06-05
> 当前阶段：Phase 4 - 产物预览与编辑（前端部分）✅ 已完成

---

## 1. 当前聚焦 (Active Focus)

- **文档预览**：已完成 DocumentPreview 组件，支持 markdown/json/text/html/ppt 五种文档类型渲染，包括 PPT 幻灯片浏览和翻页功能。
- **全屏预览**：已完成 FullscreenPreview 组件，支持 ESC 键关闭、背景遮罩和动画、自定义 children 内容。
- **版本历史**：已完成 VersionHistory 组件，支持版本列表展示、版本选择和回退、相对时间显示。
- **对话式局部修改**：已完成 CodeSelectionChat 组件，支持选中代码展示、指令输入和提交、ESC 键关闭。
- **ArtifactPreview 增强**：已更新 ArtifactPreview 组件，集成 DocumentPreview 和 FullscreenPreview，支持多种文档类型。

---

## 2. 下一步开发计划 (Next Steps)

- **目标域**：后端 FastAPI 实现 + LangGraph 群聊编排。
- **具体原子任务**：
  1. 初始化后端 FastAPI 项目结构（`backend/` 目录）
  2. 实现 WebSocket 连接池和消息路由
  3. 实现 BaseAdapter 抽象层和 ClaudeCodeAdapter
  4. 消息持久化到 PostgreSQL
  5. 实现 LangGraph Orchestrator 状态机
  6. 实现多 Agent 协作调度和结果聚合
  7. 前端 useWebSocket 钩子连接真实后端

---

## 3. 当前阻碍 (Blocks)

- **技术阻碍**：无。
- **环境阻碍**：无。前端产物预览与编辑功能已完善，TypeScript 类型检查通过，可以继续推进后端实现。

---

## 4. 关键技术决策记录 (ADR)

| 决策项 | 选型 | 理由 |
|--------|------|------|
| 前端框架 | Next.js 14 (App Router) | SSR + RSC 支持，适合 IM 实时交互场景 |
| 前端样式 | Tailwind CSS + Shadcn UI | 原子化设计，禁止第三方 CSS 库 |
| 后端框架 | FastAPI | 原生 async/await，WebSocket 支持成熟 |
| 状态机 | LangGraph | DAG 驱动多 Agent 编排，Python 生态 |
| 数据库 | PostgreSQL 15+ | JSONB 支持富媒体卡片，ACID 事务 |
| 缓存 | Redis 7+ | 分布式锁、WS 连接状态、流式缓冲 |
| 后端包管理 | `uv` | 高速依赖解析，禁止原生 `pip`/`venv` |
| 契约层 | JSON Schema (SSOT) | 单源信任，自动代码生成 |

---

## 5. 最近完成的功能 (Recent Completions)

### 5.1 文档预览
- DocumentPreview 组件支持多种文档类型渲染（markdown/json/text/html/ppt）
- MarkdownRenderer（Markdown 渲染）
- JsonRenderer（JSON 格式化显示）
- TextRenderer（纯文本渲染）
- HtmlRenderer（HTML iframe 预览）
- PptRenderer（PPT 幻灯片浏览，支持翻页）

### 5.2 全屏预览
- FullscreenPreview 全屏预览模式组件
- ESC 键关闭
- 背景遮罩和动画
- 支持自定义 children 内容

### 5.3 版本历史
- VersionHistory 版本历史组件
- 版本列表展示（版本号、时间戳、作者、提交信息、变更统计）
- 版本选择和回退功能
- 相对时间显示（刚刚、X分钟前、X小时前）

### 5.4 对话式局部修改
- CodeSelectionChat 对话式局部修改组件
- 选中代码展示（行号、代码内容）
- 指令输入和提交（Enter 发送，Shift+Enter 换行）
- ESC 键关闭

### 5.5 ArtifactPreview 增强
- 集成 DocumentPreview 和 FullscreenPreview
- 支持多种文档类型（markdown/json/text/html/ppt）
- 添加全屏预览按钮
- 添加编辑按钮
