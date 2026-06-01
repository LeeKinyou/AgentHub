# AgentHub Frontend

> 🚀 智能体多维协作与全栈编程平台 - 前端应用

## 📋 项目概述

AgentHub 是一个基于多智能体协作的全栈编程平台，前端采用 Next.js 14 + React 18 + TypeScript 构建，提供类 Trae / VS Code 的五栏布局交互体验。

## 🏗️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.2.3 | React 全栈框架 |
| React | 18.3.1 | UI 组件库 |
| TypeScript | 5.4.5 | 类型安全 |
| Tailwind CSS | 3.4.3 | 原子化样式 |
| react-markdown | 10.x | Markdown 渲染 + Mermaid 拦截 |
| File System Access API | - | 本地文件读写 |

## 🎨 核心布局

```
┌──────────┬────────┬──────────────┬───────────────────────┐
│ Project  │  File  │   Session    │   ChatArea            │
│  Dock    │ Explorer│  Sidebar    │  ┌─────────────────┐  │
│  (w-16)  │ (w-60) │  (可拖拽)    │  │  Messages + Input│  │
│          │ 可折叠  │  单聊/群聊   │  └─────────────────┘  │
│          │        │  折叠分组    │   AgentSidebar        │
│          │        │              │   (CodeEditor)        │
├──────────┴────────┴──────────────┴───────────────────────┤
│  ConsolePanel（永久常驻底部 · 点击状态栏展开/收起）         │
└──────────────────────────────────────────────────────────┘
```

- **ProjectDock**: Discord 风格项目图标坞 + 新建/打开项目 + ⚙️ 设置 + 🔄 重置 + 主题切换
- **FileExplorer**: 独立文件树列（点击项目图标展开/折叠，`w-60` / `w-0`）
- **ContextSidebar**: 会话列表（单聊/群聊折叠分组 + AvatarStack 头像堆叠）
- **ChatArea**: 聊天画布 + 输入框 + 上下文胶囊 + ArtifactPanel
- **AgentSidebar**: 代码编辑器 + Agent 面板（可拖拽宽度）
- **ConsolePanel**: 全局底部终端控制台（`h-9` 状态栏 + `h-72` 日志区，flex 弹性挤压）

## 🎯 核心功能

### 1. 多项目管理

- 点击 `+` 按钮打开/新建项目，项目图标坞支持多项目切换
- 点击已激活项目图标可折叠/展开文件树
- 项目数据自动持久化到 localStorage

### 2. 会话系统

- **单聊模式 (Direct)**: 1 对 1 与 AI Agent 对话，`+` 按钮单选 Agent 创建
- **群聊协作 (Groups)**: 多 Agent 协作，`+` 按钮打开 CreateGroupModal（需选 ≥2 个 Agent）
- 分组支持折叠/展开（Chevron 动画），群聊条目自动挂载 AvatarStack

### 3. Mock 剧本系统

输入关键词触发仿真消息流，验证多模态渲染：

| 关键词 | 剧本 | 验证目标 |
|--------|------|----------|
| `测试群聊` | Orchestrator + Codex 连续回复 | 多 Agent 气泡排列 |
| `测试Diff` | diff_patch 富媒体消息 | InlineDiffCard 红绿对比 + Apply to File |
| `测试部署` | building → 2s → success | DeployStatusCard 动画过渡 + 预览 URL |

### 4. 文件系统集成

- **File Explorer**: 递归文件树 + 右键菜单（新建/复制/删除）
- **File System Access API**: 真实文件读取/写入
- **拖拽联动**: 文件拖拽到输入框生成上下文胶囊

### 5. 代码编辑器

- **CodeEditor**: 可编辑 textarea + 💾 Save + Ctrl/Cmd+S 快捷键
- **TabBar**: 多标签页管理 + 单击预览 / 双击固定
- **Markdown 预览**: react-markdown 渲染 + Mermaid 代码块安全拦截
- **Diff 视图**: Accept/Reject 浮动操作栏 + 行级高亮

### 6. 智能输入系统

- **@Mentions**: 正则检测 + 键盘导航 + Enter 确认
- **/ 快捷指令**: `/explain`、`/bug`、`/test`
- **Context Capsules**: Agent（暗紫）/ File（暗灰）/ Snippet（浅灰）
- **文件拖拽**: 从文件树拖拽到输入框自动生成附件胶囊

### 7. 设置系统 (SettingsModal)

两栏式弹窗，左侧菜单 + 右侧面板：

- **💻 通用设置**: 占位（即将上线）
- **🤖 智能体管理**: 已注册 Agent 列表 + 自定义添加表单（名称/服务商/型号/API 密匙/System Prompt）
- **🔐 工作区安全**: 占位（即将上线）
- **📊 额度统计**: 占位（即将上线）

### 8. 控制台日志面板

- **ConsolePanel**: 全局底部永久常驻，自适应除 ProjectDock 外的全部宽度
- **状态栏**: `h-9`，点击切换展开/收起，Chevron 旋转动画
- **日志分级**: error（红）、success（绿）、warn（黄）、info（灰）
- **弹性挤压**: 展开时 `h-72`，收起时 `h-0`，物理性挤压上方内容区

### 9. 多模态富媒体消息

- **InlineDiffCard**: 内联 Diff 卡片（红绿对比 + Apply to File）
- **DeployStatusCard**: 部署状态卡片（building/deploying/success + 进度条动画）
- **AvatarStack**: 群聊头像堆叠（Hover 发散动画）
- **ArtifactPanel**: HTML 实时预览 + 代码大画布

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0（推荐）或 npm >= 9.0.0

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

开发服务器将在 http://localhost:3000 启动。

### 构建生产版本

```bash
pnpm build
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind 全局样式 + 滚动条定制
│   │   ├── layout.tsx           # 根布局
│   │   └── page.tsx             # 主页面（全局状态中枢 + 五栏布局编排）
│   ├── components/im/
│   │   ├── AgentSidebar.tsx     # 右侧 Agent 面板
│   │   ├── ArtifactPanel.tsx    # 代码大画布
│   │   ├── ArtifactPreview.tsx  # HTML 实时预览
│   │   ├── AvatarStack.tsx      # 群聊头像堆叠
│   │   ├── ChatArea.tsx         # 聊天画布（消息 + 输入）
│   │   ├── ChatHeader.tsx       # 聊天头部（Agent 头像 + 编辑器切换）
│   │   ├── CodeEditor.tsx       # 代码编辑器 + Markdown 预览
│   │   ├── ConsolePanel.tsx     # 控制台日志面板（全局底部常驻）
│   │   ├── ContextSidebar.tsx   # 会话侧边栏容器
│   │   ├── CreateGroupModal.tsx # 建群弹窗（≥2 Agent 拦截）
│   │   ├── CreateSessionModal.tsx # 新建会话弹窗（支持 singleSelect）
│   │   ├── DeployStatusCard.tsx # 部署状态卡片
│   │   ├── FileExplorer.tsx     # 文件树（独立列）
│   │   ├── InlineDiffCard.tsx   # 内联 Diff 卡片
│   │   ├── InputContextArea.tsx  # 输入上下文区域
│   │   ├── ProjectDock.tsx      # 项目坞（图标 + 设置 + 主题）
│   │   ├── SessionSidebar.tsx   # 会话列表（单聊/群聊折叠分组）
│   │   ├── SettingsModal.tsx    # 设置弹窗（四 Tab + 智能体管理）
│   │   ├── TabBar.tsx           # 标签栏
│   │   ├── ThemeToggle.tsx      # 主题切换
│   │   └── mockData.ts / mockFiles.ts / mockProjects.ts
│   ├── hooks/
│   │   ├── useEditorTabs.ts     # 多标签页管理
│   │   ├── useProjectState.ts   # 项目状态 + localStorage
│   │   ├── useTheme.ts          # 明暗主题持久化
│   │   └── useWebSocket.ts      # WebSocket 连接
│   ├── mock/
│   │   └── mockScripts.ts       # Mock 剧本（测试群聊/Diff/部署）
│   └── types/
│       └── file-system-access.d.ts
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + S` | 保存当前文件 |
| `Enter` | 发送消息 |
| `Shift + Enter` | 换行 |
| `@` | 唤醒 Agent 提及列表 |
| `/` | 唤醒快捷指令列表 |
| `↑/↓` | 导航提及/指令列表 |
| `Escape` | 关闭弹出层 |

## 🐛 常见问题

### Q: 文件读取失败怎么办？

A: 如果出现 `NotAllowedError`，请重新打开文件夹以激活文件读写权限。

### Q: 如何重置工作区？

A: 点击 ProjectDock 底部 🔄 按钮，确认后会清除所有本地数据并刷新页面。

### Q: 新添加的智能体在哪里使用？

A: 在设置弹窗添加的自定义智能体会自动出现在建群弹窗的可勾选列表中。

---

**AgentHub Team** © 2026
