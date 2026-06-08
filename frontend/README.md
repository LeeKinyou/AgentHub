# AgentHub Frontend

> 多 Agent 协作全栈编程平台 — 前端应用

## 项目概述

AgentHub 是一个基于 IM 聊天范式的多 Agent 协作编程平台。前端采用 Next.js 14 + React 18 + TypeScript 构建，提供类 Trae / VS Code 的五栏布局，支持文件系统集成、实时 WebSocket 通信、Agent 文件控制、Markdown 渲染等完整功能。

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.2.3 | React 全栈框架 |
| React | 18.3.1 | UI 组件库 |
| TypeScript | 5.4.5 | 类型安全 |
| Tailwind CSS | 3.4.3 | 原子化样式 + 明暗主题 |
| react-markdown | 10.x | Markdown 渲染 + Mermaid 拦截 |
| File System Access API | — | 本地文件读写 |
| WebSocket | — | 实时消息流 + Agent 状态推送 |

## 核心布局

```
┌──────────┬────────┬──────────────┬───────────────────────────┐
│ Project  │  File  │   Session    │   ChatArea                │
│  Dock    │Explorer│   Sidebar    │  ┌─────────────────────┐  │
│  (w-16)  │ (w-60) │  (可拖拽)    │  │ Messages + Input    │  │
│          │ 可折叠  │  单聊/群聊   │  └─────────────────────┘  │
│          │        │  折叠分组    │   AgentSidebar            │
│          │        │              │   (CodeEditor)            │
├──────────┴────────┴──────────────┴───────────────────────────┤
│  ConsolePanel（永久常驻底部 · 点击状态栏展开/收起）             │
└──────────────────────────────────────────────────────────────┘
```

## 核心功能

### 1. 认证系统

- JWT 登录/注册，access + refresh token
- 自动 token 刷新，登录过期跳转
- API 密钥 AES-256 加密存储

### 2. 多项目管理

- 点击 `+` 新建项目 → 弹窗选择父目录 + 输入项目名
- 通过 File System Access API 在本地磁盘创建项目文件夹
- 项目图标坞支持多项目切换，点击可折叠/展开文件树
- 项目数据自动持久化到 localStorage

### 3. 文件系统集成

- **File Explorer**: 递归文件树 + 右键菜单（新建/复制/删除/重命名）
- **File System Access API**: 真实文件读写，支持重新授权
- **拖拽联动**: 文件拖拽到输入框生成上下文胶囊
- **文件操作协议 (`@file_operation`)**: Agent 通过 JSON 指令创建/修改/删除文件
- **一键授权模式**: 新建项目后自动开启，Agent 文件操作无需逐个确认
- **Diff 预览**: FileOperationDialog 显示文件变更对比，支持批量审批

### 4. 会话系统

- **单聊模式**: 1 对 1 与 Agent 对话
- **群聊协作**: 多 Agent 协作，编排器自动规划 + 分派
- 分组支持折叠/展开，群聊条目自动挂载 AvatarStack 头像堆叠

### 5. Agent 系统

默认 4 个 Agent：

| 名称 | 角色 | 说明 |
|------|------|------|
| MiMo | expert | 小米 MiMo 大模型 |
| 前端工程师 | expert | 前端开发专家 |
| 后端工程师 | expert | 后端开发专家 |
| 编排器 | orchestrator | 任务编排调度 |

- **编排器**: 接收任务后先回复规划确认，再分派给专家 Agent
- **多适配器**: 支持 Claude Code / Codex / OpenCode / Custom
- **文件控制**: 所有 Agent 通过 `@file_operation` 指令操作文件

### 6. 消息系统

- **流式传输**: WebSocket 实时推送 Agent 回复
- **Markdown 渲染**: 标题、代码块、表格、列表、引用、链接等完整渲染
- **处理状态指示器**: 发送中（弹跳点）/ 处理中（旋转图标）/ 流式（脉冲标签）/ 错误 / 已中断
- **停止生成**: 流式输出时可随时打断，显示"已中断"提示
- **重新生成**: 中断或错误后可一键重试
- **Pin 消息**: 标记重要消息，自动注入上下文
- **复制/重新生成**: 每条 Agent 消息底部操作按钮
- **附件显示**: 发送附件后在消息气泡下方显示文件卡片

### 7. 代码编辑器

- **CodeEditor**: 可编辑 textarea + Save + Ctrl/Cmd+S 快捷键
- **TabBar**: 多标签页管理 + 单击预览 / 双击固定
- **Markdown 预览**: react-markdown 渲染 + Mermaid 代码块安全拦截
- **Diff 视图**: Accept/Reject 浮动操作栏 + 行级高亮

### 8. 智能输入系统

- **@Mentions**: 正则检测 + 键盘导航 + Enter 确认
- **/ 快捷指令**: `/explain`、`/bug`、`/test`
- **Context Capsules**: Agent / File / Snippet 胶囊
- **文件拖拽**: 从文件树拖拽到输入框自动生成附件

### 9. 设置系统

两栏式弹窗，左侧菜单 + 右侧面板：

- **通用设置**: 基础配置
- **智能体管理**: Agent 列表 CRUD（新增/编辑/删除）
- **工作区安全**: API 密钥加密、会话超时、审计日志、CORS 配置
- **额度统计**: Token 用量追踪、每日柱状图、模型明细

### 10. 控制台面板

- **ConsolePanel**: 全局底部永久常驻
- **macOS 风格**: 红绿黄交通灯 + TERMINAL 标题 + 错误/警告计数徽章
- **日志分级**: ERR（红）/ WARN（黄）/ INFO（蓝）/ OK（绿）+ 行号 + 时间戳
- **主题适配**: 浅色/深色主题自动切换
- **空状态**: 光标闪烁动画

### 11. 多模态富媒体消息

- **InlineDiffCard**: 内联 Diff 卡片（红绿对比 + Apply to File）
- **DeployStatusCard**: 部署状态卡片（building/deploying/success + 进度条）
- **AvatarStack**: 群聊头像堆叠（Hover 发散动画）
- **ArtifactPanel**: HTML 实时预览 + 代码大画布
- **OrchestratorStatusCard**: 编排器状态卡片（步骤连接线 + 状态指示）
- **AgentStatusCard**: Agent 执行状态卡片（进度条 + 状态标签）

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 http://localhost:3000 启动。

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css              # Tailwind 全局样式 + 滚动条 + 主题变量
│   │   ├── layout.tsx               # 根布局
│   │   ├── page.tsx                 # 主页面（全局状态中枢 + 五栏布局编排）
│   │   └── login/page.tsx           # 登录/注册页面
│   ├── components/im/
│   │   ├── AgentManagerPanel.tsx    # 智能体管理面板（CRUD）
│   │   ├── AgentSidebar.tsx         # 右侧 Agent 面板
│   │   ├── AgentStatusCard.tsx      # Agent 执行状态卡片
│   │   ├── ArtifactPanel.tsx        # 代码大画布
│   │   ├── ArtifactPreview.tsx      # HTML 实时预览
│   │   ├── AvatarStack.tsx          # 群聊头像堆叠
│   │   ├── ChatArea.tsx             # 聊天画布（消息 + 输入 + 状态指示）
│   │   ├── ChatHeader.tsx           # 聊天头部
│   │   ├── CodeEditor.tsx           # 代码编辑器 + Markdown 预览
│   │   ├── CodeSelectionChat.tsx    # 代码选中聊天
│   │   ├── CodeViewer.tsx           # 代码查看器
│   │   ├── ConsolePanel.tsx         # 控制台日志面板（终端风格）
│   │   ├── ContextSidebar.tsx       # 会话侧边栏容器
│   │   ├── CreateGroupModal.tsx     # 建群弹窗
│   │   ├── CreateProjectModal.tsx   # 新建项目弹窗（文件夹选择）
│   │   ├── CreateSessionModal.tsx   # 新建会话弹窗
│   │   ├── DeployStatusCard.tsx     # 部署状态卡片
│   │   ├── DocumentPreview.tsx      # 文档预览
│   │   ├── FileAttachment.tsx       # 文件附件卡片
│   │   ├── FileContextMenu.tsx      # 文件右键菜单
│   │   ├── FileExplorer.tsx         # 文件树
│   │   ├── FileOperationDialog.tsx  # 文件操作确认弹窗
│   │   ├── FullscreenPreview.tsx    # 全屏预览
│   │   ├── GeneralSettingsPanel.tsx # 通用设置面板
│   │   ├── InlineDiffCard.tsx       # 内联 Diff 卡片
│   │   ├── InputBar.tsx             # 输入框
│   │   ├── InputContextArea.tsx     # 输入上下文区域
│   │   ├── MarkdownRenderer.tsx     # Markdown 渲染器
│   │   ├── MentionList.tsx          # @提及列表
│   │   ├── MessageCard.tsx          # 消息卡片
│   │   ├── OrchestratorStatusCard.tsx # 编排器状态卡片
│   │   ├── PinnedMessages.tsx       # Pin 消息列表
│   │   ├── ProjectDock.tsx          # 项目坞（图标 + 设置 + 主题）
│   │   ├── SecuritySettingsPanel.tsx # 安全设置面板
│   │   ├── SessionSidebar.tsx       # 会话列表
│   │   ├── SettingsModal.tsx        # 设置弹窗
│   │   ├── TabBar.tsx               # 标签栏
│   │   ├── ThemeToggle.tsx          # 主题切换
│   │   ├── UsageStatsPanel.tsx      # 额度统计面板
│   │   ├── VersionHistory.tsx       # 版本历史
│   │   ├── fileSystemUtils.ts       # 文件系统工具函数
│   │   └── mockData.ts / mockFiles.ts / mockProjects.ts
│   ├── hooks/
│   │   ├── useBackendData.ts        # 后端数据获取（agents/sessions）
│   │   ├── useEditorTabs.ts         # 多标签页管理
│   │   ├── useFileOperations.ts     # @file_operation 解析与执行
│   │   ├── useProjectState.ts       # 项目状态 + localStorage
│   │   ├── useTheme.ts              # 明暗主题持久化
│   │   ├── useUsageTracker.ts       # Token 用量追踪
│   │   └── useWebSocket.ts          # WebSocket 连接 + 流式消息
│   ├── lib/
│   │   └── api.ts                   # API 客户端（fetch + token 刷新）
│   ├── mock/
│   │   └── mockScripts.ts           # Mock 剧本
│   └── types/
│       └── file-system-access.d.ts  # File System Access API 类型声明
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + S` | 保存当前文件 |
| `Enter` | 发送消息 |
| `Shift + Enter` | 换行 |
| `@` | 唤醒 Agent 提及列表 |
| `/` | 唤醒快捷指令列表 |
| `↑/↓` | 导航提及/指令列表 |
| `Escape` | 关闭弹出层 |

## 后端服务

前端需要后端 API 服务支持（默认 http://localhost:8001）：

```bash
cd ../backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

---

**AgentHub Team** © 2026
