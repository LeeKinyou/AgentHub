# AgentHub - 项目整体进度与 Todo List

> 最后更新：2026-06-05
> 当前阶段：Phase 4 - 产物预览与编辑（前端部分）✅ 已完成

---

## 1. 项目里程碑 (Milestones)

- [x] **Phase 0: 准备阶段 & 契约锁死** ── ✅ 已完成
  - 目标：完成所有设计文档、JSON Schema 契约、代码生成工具链
  - 交付物：`memory-bank/*.md`、`shared/schemas/*.json`、`codegen.js`、`sync_schemas.py`

- [x] **Phase 1: 骨架搭建 & 单机 Vibe** ── ✅ 已完成
  - 目标：仿飞书 IM 静态面板 + 文件系统读取 + 代码编辑器
  - 交付物：Next.js 四栏布局、FileExplorer、CodeEditor、Mentions、TabBar、Markdown 预览、Context Chips

- [x] **Phase 1.5: 前端体验深化** ── ✅ 已完成
  - 目标：交互体验打磨、持久化、拖拽联动、控制台、富媒体消息
  - 交付物：LocalStorage 持久化、文件拖拽胶囊、右键菜单、控制台面板、Diff/Deploy 卡片、AvatarStack

- [x] **Phase 2: IM 聊天式交互完善** ── ✅ 已完成
  - 目标：完善 IM 聊天式交互体验，添加置顶/归档/搜索/回复/引用/重新生成/Pin/文件附件等功能
  - 交付物：SessionSidebar 搜索与排序、消息操作按钮、PinnedMessages 组件、FileAttachment 组件

- [x] **Phase 3: Orchestrator & 多 Agent 接入（前端部分）** ── ✅ 已完成
  - 目标：Orchestrator 状态卡片、Agent 状态显示、能力标签展示
  - 交付物：OrchestratorStatusCard、AgentStatusCard、AgentSidebar 增强

- [x] **Phase 4: 产物预览与编辑（前端部分）** ── ✅ 已完成
  - 目标：文档预览、全屏预览、版本历史、对话式局部修改
  - 交付物：DocumentPreview、FullscreenPreview、VersionHistory、CodeSelectionChat、ArtifactPreview 增强

- [ ] **Phase 4.5: 后端实现（待开发）**
  - 目标：LangGraph Orchestrator 状态机、BaseAdapter、Agent 适配器
  - 交付物：FastAPI 后端、WebSocket 连接池、ClaudeCodeAdapter、CodexAdapter

- [ ] **Phase 5: 部署与发布**
  - 目标：一键部署、域名绑定、监控告警
  - 交付物：Vercel/Netlify 部署、GitHub Actions CI/CD

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

### 2.3 [已完成] Phase 1.5 - 前端体验深化

#### LocalStorage 持久化
- [x] 创建 `useProjectState.ts` Hook 管理项目状态 + localStorage 延迟初始化
- [x] 实现 `agenthub_projects` / `agenthub_active_project_id` / `agenthub_active_session_id` 三键持久化
- [x] 实现 useEffect 副作用实时同步落盘
- [x] 实现文件句柄失效防御（try/catch + NotAllowedError 优雅降级）
- [x] 重构 `page.tsx` 从 242 行压缩至 123 行

#### 文件拖拽联动
- [x] 实现 FileExplorer 文件节点 `draggable` + `onDragStart` 设置 DataTransfer
- [x] 实现 InputContextArea Drop 接收区 + 靛蓝虚线高亮视觉反馈
- [x] 实现 ChatArea `handleDropFile` 回调 + 去重检查生成 ContextItem 胶囊

#### 单击预览 / 双击固定 Tab
- [x] 扩展 `EditorTab` 类型添加 `isTransient?: boolean` 字段
- [x] 实现 TabBar 斜体淡化样式（`italic text-zinc-500/80`）+ 双击固定事件
- [x] 实现 FileExplorer 单击触发 `onOpenFileTransient`（预览）、双击触发 `onOpenFile`（固定）
- [x] 实现 `openTab` transient 模式覆写现有临时 Tab
- [x] 实现 CodeEditor 编辑自愈（首次打字自动 `pinTab` 固定）

#### 文件树右键上下文菜单
- [x] 创建 `FileContextMenu.tsx` 右键菜单组件（新建/复制/删除）
- [x] 实现 FileExplorer `onContextMenu` 事件拦截 + 菜单定位
- [x] 实现自定义文件名输入模态框（替代 prompt()）
- [x] 实现 `useProjectState.handleFileAction` 状态树 + 物理句柄双轨 CRUD

#### 控制台日志面板
- [x] 创建 `ConsolePanel.tsx` 控制台面板组件（TERMINAL LOGS）
- [x] 实现日志分级高亮（error/success/warn/info）
- [x] 实现智能触底 `scrollIntoView({ behavior: 'smooth' })`
- [x] 实现 ProjectDock 控制台触发按钮 + 日志计数徽章
- [x] 实现 page.tsx 日志自动采集（文件操作、聊天消息、系统事件）

#### 多模态富媒体消息
- [x] 创建 `InlineDiffCard.tsx` 内联 Diff 卡片（红绿对比代码 + Apply to File）
- [x] 创建 `DeployStatusCard.tsx` 部署状态卡片（building/deploying/success + 进度条动画）
- [x] 实现 ChatArea `contentType` 扩展支持 `diff_patch` / `deploy_status`
- [x] 实现消息气泡 group-hover 操作按钮（📋 复制 / 📌 Pin）

#### AvatarStack 群聊头像
- [x] 创建 `AvatarStack.tsx` 群聊头像堆叠组件
- [x] 实现 `-space-x-3` → `hover:space-x-1` 发散动画
- [x] 实现 Agent ID → 渐变背景 + Emoji 映射表
- [x] 集成至 SessionSidebar 群聊会话列表项

#### 一键重置工作区
- [x] 实现 ProjectDock 底部 Factory Reset 按钮（RotateCcw 图标）
- [x] 实现向右向上弹出双重确认气泡
- [x] 实现 `localStorage.clear()` + `window.location.reload()` 重置逻辑

### 2.4 [已完成] Phase 2 - IM 聊天式交互完善

#### 会话列表增强
- [x] 更新 `shared/schemas/entities.json` 添加 Session 新字段（isPinned/isArchived/lastActiveAt/lastMessagePreview）
- [x] 更新 `shared/types/entities.ts` 手动同步新字段类型定义
- [x] 更新 `SessionSidebar.tsx` 添加搜索框和归档切换按钮
- [x] 实现会话按置顶状态和最近活跃时间排序
- [x] 实现置顶/归档操作按钮（📌 置顶/📦 归档）
- [x] 更新 `ContextSidebar.tsx` 传递 onPinSession/onArchiveSession 回调
- [x] 更新 `useProjectState.ts` 添加 handleTogglePinSession/handleToggleArchiveSession 函数

#### 消息操作增强
- [x] 更新 `ChatArea.tsx` 添加 onReply/onQuote/onRegenerate/onPinMessage 回调
- [x] 更新 `MessageBubble` 组件添加回复/引用/重新生成/Pin 操作按钮
- [x] 实现回复消息引用显示（replyToId）
- [x] 实现引用消息功能（提取前3行作为引用）
- [x] 实现重新生成功能（回调通知）
- [x] 实现 Pin 消息切换功能（isPinned 状态）
- [x] 更新 `InputContextArea.tsx` 添加 replyToId 和 onClearReply props
- [x] 实现回复消息提示条和清除按钮

#### 上下文管理增强
- [x] 创建 `PinnedMessages.tsx` 组件显示已固定消息列表
- [x] 实现已固定消息展开/折叠功能
- [x] 实现跳转到消息功能（scrollIntoView）
- [x] 实现取消固定功能
- [x] 更新 `ChatArea.tsx` 集成 PinnedMessages 组件

#### 文件附件支持
- [x] 更新 `shared/types/entities.ts` 添加 FileAttachment 接口和 image/file contentType
- [x] 创建 `FileAttachment.tsx` 文件附件卡片组件
- [x] 实现文件图标映射（根据 MIME 类型显示不同图标）
- [x] 实现文件大小格式化显示
- [x] 实现图片附件缩略图预览
- [x] 实现下载和预览按钮
- [x] 更新 `MessageBubble` 组件渲染附件列表

#### 类型安全修复
- [x] 更新 `shared/types/ws_messages.ts` 添加 WSMessage 类型别名
- [x] 运行 TypeScript 类型检查确保无错误

### 2.5 [已完成] Phase 3 - Orchestrator & 多 Agent 接入（前端部分）

#### Orchestrator 状态卡片
- [x] 创建 `OrchestratorStatusCard.tsx` 组件展示编排状态（thinking/planning/dispatching/aggregating/completed/failed）
- [x] 实现任务步骤列表展示（TaskStep 接口：order/description/assignedAgent/status）
- [x] 实现展开/折叠功能
- [x] 实现失败重试按钮
- [x] 实现并行调度动画指示器

#### Agent 状态卡片
- [x] 创建 `AgentStatusCard.tsx` 组件展示 Agent 执行状态（analyzing/executing/completed/failed）
- [x] 实现进度条显示
- [x] 实现失败重试按钮
- [x] 实现加载动画

#### Agent 面板增强
- [x] 更新 `AgentSidebar.tsx` 添加 StatusIndicator 组件（online/offline/busy/error 状态指示）
- [x] 实现能力标签展示（CAPABILITY_TAGS：code_gen/web_search/fs_io/terminal/deploy）
- [x] 实现在线 Agent 数量统计
- [x] 更新 ChatArea 集成 OrchestratorStatusCard 和 AgentStatusCard
- [x] 扩展 StreamMessage 类型支持 orchestrator_status 和 agent_status contentType

### 2.6 [已完成] Phase 4 - 产物预览与编辑（前端部分）

#### 文档预览
- [x] 创建 `DocumentPreview.tsx` 组件支持多种文档类型渲染（markdown/json/text/html/ppt）
- [x] 实现 MarkdownRenderer（Markdown 渲染）
- [x] 实现 JsonRenderer（JSON 格式化显示）
- [x] 实现 TextRenderer（纯文本渲染）
- [x] 实现 HtmlRenderer（HTML iframe 预览）
- [x] 实现 PptRenderer（PPT 幻灯片浏览，支持翻页）

#### 全屏预览
- [x] 创建 `FullscreenPreview.tsx` 全屏预览模式组件
- [x] 实现 ESC 键关闭
- [x] 实现背景遮罩和动画
- [x] 支持自定义 children 内容

#### 版本历史
- [x] 创建 `VersionHistory.tsx` 版本历史组件
- [x] 实现版本列表展示（版本号、时间戳、作者、提交信息、变更统计）
- [x] 实现版本选择和回退功能
- [x] 实现相对时间显示（刚刚、X分钟前、X小时前）

#### 对话式局部修改
- [x] 创建 `CodeSelectionChat.tsx` 对话式局部修改组件
- [x] 实现选中代码展示（行号、代码内容）
- [x] 实现指令输入和提交（Enter 发送，Shift+Enter 换行）
- [x] 实现 ESC 键关闭

#### ArtifactPreview 增强
- [x] 更新 `ArtifactPreview.tsx` 集成 DocumentPreview 和 FullscreenPreview
- [x] 支持多种文档类型（markdown/json/text/html/ppt）
- [x] 添加全屏预览按钮
- [x] 添加编辑按钮

---

## 3. 进度统计

| 阶段 | 总任务数 | 已完成 | 进度 |
|------|---------|--------|------|
| Phase 0 准备阶段 | 12 | 12 | 100% |
| Phase 1 前端骨架 | 36 | 36 | 100% |
| Phase 1.5 体验深化 | 32 | 32 | 100% |
| Phase 2 IM 交互完善 | 25 | 25 | 100% |
| Phase 3 Orchestrator 前端 | 15 | 15 | 100% |
| Phase 4 产物预览前端 | 20 | 20 | 100% |
| Phase 4.5 后端实现 | 0 | 0 | 0% |
| Phase 5 部署与发布 | 0 | 0 | 0% |
| **总计** | **140** | **140** | **100%** |

---

## 4. 技术栈总结

### 前端
- **框架**：Next.js 14 + React 18
- **样式**：Tailwind CSS 3.4 + 暗黑 Zinc 色调
- **类型**：TypeScript 5.4 + JSON Schema 自动生成
- **布局**：四栏指挥中心（ProjectDock + ContextSidebar + ChatArea + AgentSidebar）
- **API**：File System Access API（真实文件读取/写入）
- **Hooks**：useEditorTabs（多标签页管理）、useTheme（明暗主题持久化）、useProjectState（项目状态 + localStorage）
- **编辑器**：CodeEditor + TabBar + Markdown 预览 + Diff 注入与合并 + 单击预览/双击固定
- **交互**：@Mentions 提及 + / 快捷指令 + Context Chips 上下文胶囊 + 文件拖拽联动
- **面板**：ConsolePanel（TERMINAL LOGS 控制台日志）
- **富媒体**：InlineDiffCard + DeployStatusCard + AvatarStack
- **会话管理**：SessionSidebar 搜索/置顶/归档 + PinnedMessages 固定消息
- **消息操作**：回复/引用/重新生成/Pin + FileAttachment 文件附件
- **编排状态**：OrchestratorStatusCard（thinking/planning/dispatching/aggregating）+ AgentStatusCard（analyzing/executing/completed/failed）
- **Agent 面板**：StatusIndicator 状态指示 + 能力标签展示 + 在线统计
- **产物预览**：DocumentPreview（markdown/json/text/html/ppt）+ FullscreenPreview（全屏预览）+ VersionHistory（版本历史）+ CodeSelectionChat（对话式局部修改）

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

### Phase 4.5 - 后端实现（待开发）
1. 初始化后端 FastAPI 项目结构（`backend/` 目录）
2. 实现 WebSocket 连接池和消息路由
3. 实现 BaseAdapter 抽象层和 ClaudeCodeAdapter
4. 消息持久化到 PostgreSQL
5. 实现 LangGraph Orchestrator 状态机
6. 实现多 Agent 协作调度和结果聚合
7. 前端 useWebSocket 钩子连接真实后端
