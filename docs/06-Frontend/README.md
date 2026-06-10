# 前端架构文档

> 前端技术栈：Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Zustand

---

## 一、组件树结构

```
frontend/src/
├── app/
│   ├── page.tsx              # 主页面（布局组合）
│   ├── login/page.tsx        # 登录页
│   └── globals.css           # 全局样式 + 动画定义
├── components/im/
│   ├── ProjectDock           # 左侧项目坞（图标栏）
│   ├── FileExplorer          # 文件树浏览
│   ├── ContextSidebar        # 上下文侧边栏（文件树 + 会话列表）
│   │   ├── SessionSidebar    # 会话列表
│   │   └── AgentSidebar      # Agent 面板 / 代码编辑器容器
│   ├── ChatArea              # 聊天区域容器
│   │   ├── ChatHeader        # 会话标题栏
│   │   ├── MessageBubble     # 单条消息气泡（内联组件）
│   │   │   ├── MarkdownRenderer    # Markdown 渲染
│   │   │   ├── InlineDiffCard      # Diff 卡片
│   │   │   ├── ArtifactPreview     # HTML 预览
│   │   │   ├── SandboxPreview      # iframe 沙箱预览
│   │   │   ├── DeployStatusCard    # 部署状态
│   │   │   ├── OrchestratorStatusCard # 编排状态
│   │   │   ├── AgentStatusCard     # Agent 执行状态
│   │   │   └── FileAttachment      # 文件附件
│   │   ├── PinnedMessages    # 置顶消息栏
│   │   ├── InputContextArea  # 输入区域（上下文 + 文本框）
│   │   │   ├── MentionList   # @提及列表
│   │   │   └── InputBar      # 简化版输入框（独立使用时）
│   │   └── ArtifactPanel     # 代码面板
│   ├── CodeEditor            # Monaco 编辑器
│   │   └── TabBar            # 标签页栏
│   ├── OrchestratorVisualizer # Agent 拓扑可视化（React Flow）
│   ├── ConsolePanel          # 控制台日志
│   ├── CreateSessionModal    # 创建会话弹窗
│   ├── CreateGroupModal      # 创建群聊弹窗
│   ├── CreateProjectModal    # 创建项目弹窗
│   ├── SettingsModal         # 设置弹窗
│   │   ├── GeneralSettingsPanel
│   │   └── SecuritySettingsPanel
│   └── FileOperationDialog   # 文件操作确认对话框
├── stores/
│   ├── useChatStore.ts       # 消息状态管理
│   ├── useUIStore.ts         # UI 状态管理
│   └── useEditorStore.ts     # 编辑器状态管理
├── hooks/
│   ├── useWebSocket.ts       # WebSocket 连接与消息处理
│   ├── useBackendData.ts     # 后端数据获取（REST API）
│   ├── useEditorTabs.ts      # 编辑器标签页管理
│   ├── useTheme.ts           # 主题切换
│   ├── useAuth.ts            # 认证状态
│   ├── useProjectState.ts    # 项目状态管理
│   ├── useFileOperations.ts  # 文件操作审批
│   └── useUsageTracker.ts    # Token 用量追踪
└── lib/
    └── api.ts                # REST API 客户端
```

---

## 二、状态管理

### Zustand Store 划分

| Store | 职责 | 关键状态 |
|-------|------|----------|
| `useChatStore` | 消息数据 | messages, activeSessionId, addMessage, updateMessage |
| `useUIStore` | UI 开关 | isRightPanelOpen, isConsoleOpen, isSettingsOpen 等 |
| `useEditorStore` | 编辑器 | tabs, activeTabIds, openTab, injectDiff, applyDiff |

### 数据流向

```
用户操作 → UI Store (状态变更)
                ↓
         组件重渲染
                ↓
    WebSocket 消息 → Chat Store (消息更新)
                ↓
         消息列表重渲染
                ↓
    编辑器操作 → Editor Store (Tab 管理)
```

### Hooks 职责

- `useWebSocket`: 管理 WebSocket 连接生命周期，处理 `messageChunk`、`messageComplete`、`agentStatus`、`error` 消息
- `useBackendData`: 封装 REST API 调用（agents、sessions、messages），提供 CRUD 操作
- `useProjectState`: 管理本地项目状态（文件树、会话、项目列表），使用 localStorage 持久化

---

## 三、WebSocket 消息流

### 前端处理的消息类型

| 消息类型 | 处理逻辑 |
|----------|----------|
| `messageChunk` | 流式追加消息内容，更新 `isStreaming` 状态 |
| `messageComplete` | 标记消息完成，清除流式状态，记录 token 用量 |
| `agentStatus` | 更新处理状态（planning/executing/completed/failed） |
| `error` | 显示错误信息，设置 error 状态 |
| `pong` | 心跳响应，保持连接 |

### 消息处理流程

```
WebSocket 接收消息
    ↓
useWebSocket.onMessage 解析 JSON
    ↓
根据 type 分发到回调:
  ├─ messageChunk → handleChunk()
  │   ├─ text: 追加到消息列表，标记 isStreaming
  │   └─ tool_status: 记录工具执行日志
  ├─ messageComplete → handleMessageComplete()
  │   ├─ 清除所有 streaming 标记
  │   ├─ 记录 token 用量
  │   └─ 检查 @file_operation 指令
  ├─ agentStatus → handleAgentStatus()
  │   └─ 更新 processingStatus 状态机
  └─ error → handleError()
      └─ 显示错误日志 + 设置 error 状态
```

---

## 四、关键组件职责

### ChatArea
- 渲染消息列表，支持自动滚动（仅在接近底部时）
- 管理代码块点击 → ArtifactPanel 展开
- 处理文件拖拽到上下文区域
- 显示 Agent 处理状态指示器（发送中/处理中/流式生成/错误）

### InputBar / InputContextArea
- 用户文本输入 + @提及 Agent + /快捷指令
- 附件上传（点击 Paperclip 按钮 + 拖拽文件）
- 上下文管理（文件/Agent/代码片段 chips）
- 支持 Enter/Ctrl+Enter 发送模式切换

### OrchestratorVisualizer
- 使用 React Flow 展示 Agent 节点拓扑图
- 节点状态实时更新（idle/working/done/error）
- 连线表示任务依赖关系，执行中的连线带动画

### SandboxPreview
- `<iframe sandbox="allow-scripts">` 安全隔离预览
- 支持 postMessage 热更新（编辑器代码变更 → iframe 无刷更新）
- 支持全屏切换

### CodeEditor
- Monaco Editor 集成，支持语法高亮
- 多标签页管理（打开/关闭/切换/Pin）
- Diff 视图（接受/拒绝变更）
- Markdown 预览模式

---

## 五、数据流图

```
User 输入消息
    ↓
InputContextArea.onSend(text)
    ↓
page.tsx.handleSend()
  ├─ 构建上下文（文件内容 + 文件树 + Pin 消息）
  ├─ 创建本地 MockMessage → addMessage()
  └─ wsSendMessage(enrichedText)
      ↓
  WebSocket → Backend
      ↓
  Orchestrator 分析意图
      ↓
  Agent 执行（可能多个并行）
      ↓
  WebSocket 推送:
    ├─ agentStatus → 前端更新处理状态
    ├─ messageChunk → 前端流式渲染
    └─ messageComplete → 前端标记完成
      ↓
  ChatArea 渲染消息列表
    ├─ MarkdownRenderer 渲染文本
    ├─ ArtifactPreview 渲染 HTML 预览
    ├─ SandboxPreview 渲染 iframe 沙箱
    └─ InlineDiffCard 渲染代码 Diff
```

---

## 六、样式系统

- **设计语言**：苹果极简风格，少即是多
- **色彩**：纯白/极浅灰背景，接近纯黑文本，单一强调色（蓝 #0071E3）
- **边框**：1px 极浅灰，能用留白就不用边框
- **动效**：`transition-all duration-300 ease-in-out`，仅允许淡入
- **Dark Mode**：所有组件支持 `dark:` 变体
- **图标**：单色线条 SVG（stroke-width 1.5），跟随文本色
