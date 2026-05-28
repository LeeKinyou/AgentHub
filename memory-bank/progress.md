# AgentHub - 项目整体进度与 Todo List

> 最后更新：2026-05-28
> 当前阶段：Phase 1 - 骨架搭建 & 单机 Vibe ✅ 已完成

---

## 1. 项目里程碑 (Milestones)

- [x] **Phase 0: 准备阶段 & 契约锁死** ── ✅ 已完成
  - 目标：完成所有设计文档、JSON Schema 契约、代码生成工具链
  - 交付物：`memory-bank/*.md`、`shared/schemas/*.json`、`codegen.js`、`sync_schemas.py`

- [x] **Phase 1: 骨架搭建 & 单机 Vibe** ── ✅ 已完成
  - 目标：仿飞书 IM 静态面板 + 文件系统读取 + 代码编辑器
  - 交付物：Next.js 四栏布局、FileExplorer、CodeEditor、Mentions、TabBar、Markdown 预览、Context Chips

- [ ] **Phase 2: 单聊跑通 & 适配器层**
  - 目标：1v1 持久化流式聊天完整闭环
  - 交付物：`BaseAdapter` 抽象层、`ClaudeCodeAdapter` 实现、消息持久化到 PostgreSQL

- [ ] **Phase 3: 核心突破 & 群聊编排**
  - 目标：LangGraph Orchestrator 状态机驱动多 Agent 协作
  - 交付物：DAG 状态机、任务拆解、并发调度锁、结果聚合

- [ ] **Phase 4: 体验升华 & 沙箱预览**
  - 目标：富媒体卡片 + iframe 实时渲染
  - 交付物：代码 Diff 卡片、网页预览卡片、部署状态卡片

---

## 2. 详细任务看板 (Kanban Board)

### 2.1 [已完成] Phase 0 - 准备阶段 & 契约锁死

- [x] 根目录顶级全局硬约束 `.traerules` 治理规范制定
- [x] 初始化 `memory-bank/project-design-doc.md` (产品宏观设计)
- [x] 初始化 `memory-bank/architecture.md` (系统架构与通信规范)
- [x] 初始化 `memory-bank/database-schema.md` (高并发数据库与缓存设计)
- [x] 初始化 `memory-bank/agent_workflow.md` (LangGraph 多智能体状态机流转图纸)
- [x] 初始化 `memory-bank/progress.md` (进度文档)
- [x] 构建 `shared/schemas/entities.json` 核心实体契约（AgentProfile、Session、Message + CardData）
- [x] 构建 `shared/schemas/ws_messages.json` WebSocket 双向通信报文契约（8 种消息类型）
- [x] 编写前端自动化脚本 `shared/scripts/codegen.js` 并打通 TS 类型导出
- [x] 编写后端自动化脚本 `backend/scripts/sync_schemas.py` 自动生成 Pydantic v2 模型
- [x] 创建 `shared/types/entities.ts` + `shared/types/ws_messages.ts` 强类型定义
- [x] 创建 `shared/index.ts` 统一导出入口

### 2.2 [已完成] Phase 1 - 前端 IM 骨架搭建

#### 核心布局架构
- [x] 创建 `frontend/src/app/globals.css` Tailwind 全局样式 + 滚动条定制
- [x] 创建 `frontend/tailwind.config.js` 内容扫描路径配置
- [x] 创建 `frontend/postcss.config.js` PostCSS 插件流桥梁
- [x] 创建 `frontend/src/app/layout.tsx` 根布局 + 导入全局样式
- [x] 创建 `frontend/src/app/page.tsx` 四栏指挥中心主页面

#### 四栏布局组件
- [x] 创建 `ProjectDock.tsx` Discord 风格项目图标坞（w-16）
- [x] 创建 `ContextSidebar.tsx` 垂直二合一控制栏（FileExplorer + SessionSidebar）
- [x] 创建 `ChatArea.tsx` 核心聊天画布（ChatHeader + MessageList + InputBar）
- [x] 创建 `AgentSidebar.tsx` 右侧专家面板（支持 children 插槽）

#### 会话管理
- [x] 创建 `SessionSidebar.tsx` 会话列表 + 紫色激活指示条 + "+" 按钮
- [x] 创建 `CreateGroupModal.tsx` 创建群组模态弹窗 + Agent 卡片勾选
- [x] 创建 `CreateSessionModal.tsx` 会话创建模态弹窗 + Agent 多选

#### 消息渲染
- [x] 创建 `MessageCard.tsx` 消息气泡 + CodeBlock 缩略标签
- [x] 创建 `ArtifactPanel.tsx` 右侧代码大画布（行号 + 复制 + 应用更改）
- [x] 创建 `ArtifactPreview.tsx` HTML/CSS/JS 实时预览（iframe sandbox）
- [x] 创建 `CodeViewer.tsx` 代码高亮查看器
- [x] 实现流式消息打字机效果（模拟 AI 逐字输出）

#### 输入与交互
- [x] 创建 `InputBar.tsx` 底部输入框 + 聚焦光晕效果
- [x] 创建 `MentionList.tsx` @提及智能体悬浮面板
- [x] 创建 `InputContextArea.tsx` 上下文胶囊（Context Chips）+ @Mentions + / 快捷指令
- [x] 实现 @Mentions 正则检测 + 键盘导航 + Enter 确认
- [x] 升级 Context Chips 视觉语义：Agent 暗紫色「🤖 提及」、File 暗灰色「📄 附件」、Hover 红色 × 删除

#### 文件系统集成
- [x] 创建 `fileSystemUtils.ts` File System Access API 工具函数
- [x] 创建 `FileExplorer.tsx` 递归文件树渲染 + 打开本地文件夹
- [x] 实现 `traverseDirectory` 异步递归解析（黑名单过滤 node_modules/.git/.next）
- [x] 实现文件点击 → 右侧画布实时读取物理文件内容

#### 代码编辑器
- [x] 创建 `CodeEditor.tsx` 可编辑 textarea + 💾 Save 按钮 + Ctrl/Cmd+S 快捷键
- [x] 实现 `handleSaveFile` 通过 FileSystemFileHandle 写入本地磁盘
- [x] 创建 `TabBar.tsx` 多标签页管理 + 横向溢出滚动 + flex-shrink-0 固定宽度
- [x] 实现 `useEditorTabs` Hook（openTab / closeTab / updateTabContent / Diff 注入与合并）
- [x] 实现 Markdown 实时预览切换（👁️ 按钮 + prose 渲染容器）
- [x] 实现 Diff 视图（Accept/Reject 浮动操作栏 + 行级高亮）

#### 主题与样式
- [x] 创建 `ThemeToggle.tsx` 明暗主题切换按钮
- [x] 实现 `useTheme` Hook（localStorage 持久化 + system 跟随 + class 切换）
- [x] 实现可拖拽面板宽度调节（ContextSidebar + AgentSidebar）

#### Mock 数据
- [x] 创建 `mockData.ts` 3 个 Agent + 2 个 Session + 6 条消息（含 codeBlock 卡片）
- [x] 创建 `mockProjects.ts` 2 个项目（🚀 AgentHub / 🐍 QuantEngine）
- [x] 创建 `mockFiles.ts` FileNode 接口定义

---

## 3. 进度统计

| 阶段 | 总任务数 | 已完成 | 进度 |
|------|---------|--------|------|
| Phase 0 准备阶段 | 12 | 12 | 100% |
| Phase 1 前端骨架 | 36 | 36 | 100% |
| Phase 2 单聊跑通 | 0 | 0 | 0% |
| Phase 3 群聊编排 | 0 | 0 | 0% |
| Phase 4 沙箱预览 | 0 | 0 | 0% |
| **总计** | **48** | **48** | **100%** |

---

## 4. 技术栈总结

### 前端
- **框架**：Next.js 14 + React 18
- **样式**：Tailwind CSS 3.4 + 暗黑 Zinc 色调
- **类型**：TypeScript 5.4 + JSON Schema 自动生成
- **布局**：四栏指挥中心（ProjectDock + ContextSidebar + ChatArea + AgentSidebar）
- **API**：File System Access API（真实文件读取/写入）
- **Hooks**：useEditorTabs（多标签页管理）、useTheme（明暗主题持久化）
- **编辑器**：CodeEditor + TabBar + Markdown 预览 + Diff 注入与合并
- **交互**：@Mentions 提及 + / 快捷指令 + Context Chips 上下文胶囊

### 后端（待实现）
- **框架**：FastAPI + Python 3.11
- **编排**：LangGraph DAG 状态机
- **数据库**：PostgreSQL + pgvector + Redis
- **包管理**：uv

### 契约层
- **Schema**：JSON Schema Draft-07
- **类型生成**：json-schema-to-typescript（前端）+ datamodel-code-generator（后端）
- **通信协议**：WebSocket 双向报文（8 种消息类型）

---

## 5. 下一步行动

### Phase 2 - 单聊跑通 & 适配器层
1. 初始化后端 FastAPI 项目结构
2. 实现 WebSocket 连接池
3. 实现 BaseAdapter 抽象层
4. 实现 ClaudeCodeAdapter
5. 消息持久化到 PostgreSQL
6. 前端 useWebSocket 钩子
