# AgentHub Frontend

> 🚀 智能体多维协作与全栈编程平台 - 前端应用

## 📋 项目概述

AgentHub 是一个基于多智能体协作的全栈编程平台，前端采用 Next.js 14 + React 18 + TypeScript 构建，提供类飞书 IM 的四栏布局交互体验。

## 🏗️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.2.3 | React 全栈框架 |
| React | 18.3.1 | UI 组件库 |
| TypeScript | 5.4.5 | 类型安全 |
| Tailwind CSS | 3.4.3 | 原子化样式 |
| File System Access API | - | 本地文件读写 |

## 🎨 核心功能

### 1. 四栏指挥中心布局

```
┌──────────┬──────────────────────┬───────────────┐
│ Project  │    ContextSidebar    │   AgentSidebar │
│  Dock    │  ┌────────────────┐  │  (CodeEditor)  │
│  (16px)  │  │   ChatArea     │  │   可拖拽宽度   │
│          │  │ (消息列表+输入) │  │               │
│          │  └────────────────┘  │               │
└──────────┴──────────────────────┴───────────────┘
```

- **ProjectDock**: Discord 风格项目图标坞（左侧 16px）
- **ContextSidebar**: 文件树 + 会话列表（可拖拽宽度）
- **ChatArea**: 聊天画布 + 输入框 + 上下文胶囊
- **AgentSidebar**: 代码编辑器 + Agent 面板（可拖拽宽度）

### 2. 多项目 Tabs 隔离

- 基于 `activeProjectId` 物理隔离
- 切换项目时 Tab 数组无缝切换
- TabBar 支持无限多开防挤压的横向溢出滚动

### 3. 文件系统集成

- **File Explorer**: 递归文件树渲染 + 打开本地文件夹
- **File System Access API**: 真实文件读取/写入
- **拖拽联动**: 文件拖拽到输入框生成上下文胶囊
- **右键菜单**: 新建/复制/删除文件

### 4. 代码编辑器

- **CodeEditor**: 可编辑 textarea + 💾 Save 按钮 + Ctrl/Cmd+S 快捷键
- **TabBar**: 多标签页管理 + 单击预览（斜体）/ 双击固定（正体）
- **Markdown 预览**: 👁️ 按钮切换源码/渲染视图
- **Diff 视图**: Accept/Reject 浮动操作栏 + 行级高亮

### 5. 智能输入系统

- **@Mentions**: 正则检测 + 键盘导航 + Enter 确认
- **/ 快捷指令**: `/explain`、`/bug`、`/test`
- **Context Chips**: 上下文胶囊（Agent 暗紫色、File 暗灰色、Snippet 浅灰色）
- **文件拖拽**: 从文件树拖拽到输入框自动生成附件胶囊

### 6. 多模态富媒体消息

- **InlineDiffCard**: 内联 Diff 卡片（红绿对比代码 + Apply to File）
- **DeployStatusCard**: 部署状态卡片（building/deploying/success + 进度条动画）
- **AvatarStack**: 群聊头像堆叠特效（Hover 发散动画）

### 7. 控制台日志面板

- **ConsolePanel**: TERMINAL LOGS 控制台
- **日志分级**: error（红色）、success（绿色）、warn（黄色）、info（灰色）
- **智能触底**: 自动滚动到最新日志
- **一键清空**: 🧹 Clear 按钮

### 8. 持久化与状态管理

- **LocalStorage**: 项目列表、活跃项目、活跃会话自动持久化
- **useProjectState**: 项目状态管理 Hook
- **useEditorTabs**: 多标签页管理 Hook
- **useTheme**: 明暗主题持久化（跟随系统 + 手动切换）

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0（推荐）或 npm >= 9.0.0

### 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 启动开发服务器

```bash
# 使用 pnpm
pnpm dev

# 或使用 npm
npm run dev
```

开发服务器将在 http://localhost:3000 启动。

### 构建生产版本

```bash
# 使用 pnpm
pnpm build

# 或使用 npm
npm run build
```

### 启动生产服务器

```bash
# 使用 pnpm
pnpm start

# 或使用 npm
npm start
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind 全局样式 + 滚动条定制
│   │   ├── layout.tsx           # 根布局
│   │   └── page.tsx             # 主页面（核心状态管理中枢）
│   ├── components/
│   │   └── im/                  # IM 组件目录
│   │       ├── AgentSidebar.tsx     # 右侧 Agent 面板
│   │       ├── ArtifactPanel.tsx    # 代码大画布
│   │       ├── ArtifactPreview.tsx  # HTML 实时预览
│   │       ├── AvatarStack.tsx      # 群聊头像堆叠
│   │       ├── ChatArea.tsx         # 聊天画布
│   │       ├── ChatHeader.tsx       # 聊天头部
│   │       ├── CodeEditor.tsx       # 代码编辑器
│   │       ├── ConsolePanel.tsx     # 控制台日志面板
│   │       ├── ContextSidebar.tsx   # 上下文侧边栏
│   │       ├── DeployStatusCard.tsx # 部署状态卡片
│   │       ├── FileContextMenu.tsx  # 文件右键菜单
│   │       ├── FileExplorer.tsx     # 文件树
│   │       ├── InlineDiffCard.tsx   # 内联 Diff 卡片
│   │       ├── InputContextArea.tsx  # 输入上下文区域
│   │       ├── ProjectDock.tsx      # 项目坞
│   │       ├── SessionSidebar.tsx   # 会话列表
│   │       ├── TabBar.tsx           # 标签栏
│   │       ├── ThemeToggle.tsx      # 主题切换
│   │       └── ...                  # 其他组件
│   ├── hooks/
│   │   ├── useEditorTabs.ts     # 多标签页管理
│   │   ├── useProjectState.ts   # 项目状态 + localStorage
│   │   └── useTheme.ts          # 明暗主题持久化
│   └── types/
│       └── file-system-access.d.ts  # File System Access API 类型
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

## 🎯 使用指南

### 1. 创建/打开项目

- 点击左上角 📂 图标打开本地文件夹
- 或点击 ✨ 图标创建新项目
- 项目列表会自动持久化到 localStorage

### 2. 管理会话

- 点击左侧 + 按钮创建新会话
- 支持单聊和群组会话
- 群组会话可选择多个 Agent 协作

### 3. 文件操作

- **单击文件**: 临时预览（斜体标签）
- **双击文件**: 固定打开（正体标签）
- **右键文件**: 新建/复制/删除操作
- **拖拽文件**: 拖到输入框生成附件胶囊

### 4. 代码编辑

- 支持多标签页同时编辑
- Ctrl/Cmd+S 保存到本地磁盘
- Markdown 文件支持 👁️ 预览切换
- Diff 视图支持 Accept/Reject 操作

### 5. 消息交互

- **@ 提及**: 输入 @ 唤醒 Agent 列表
- **/ 指令**: 输入 / 查看快捷指令
- **发送消息**: Enter 发送，Shift+Enter 换行
- **控制台**: 点击左下角 🖥️ 查看日志

## 🎨 主题系统

支持三种主题模式：

- **Light**: 明亮主题
- **Dark**: 暗黑主题（默认）
- **System**: 跟随系统设置

主题切换按钮位于左下角 ProjectDock 底部。

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

## 🔧 配置说明

### 环境变量

前端无需额外环境变量配置，所有配置通过后端 API 获取。

### 自定义样式

修改 `tailwind.config.js` 自定义主题色：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          // ...
        },
      },
    },
  },
};
```

## 🐛 常见问题

### Q: 文件读取失败怎么办？

A: 如果出现 `NotAllowedError`，请点击左侧 [重新授权] 或重新打开文件夹以激活文件读写权限。

### Q: 如何重置工作区？

A: 点击左下角 🔄 按钮，确认后会清除所有本地数据并刷新页面。

### Q: 标签页太多怎么办？

A: 支持横向溢出滚动，鼠标悬停可关闭标签页，或右键文件选择关闭。

## 📦 构建产物

```bash
# 构建分析
npm run build

# 输出示例
Route (app)                              Size     First Load JS
┌ ○ /                                    18.2 kB         105 kB
├ ○ /_not-found                          872 B          87.8 kB
└ ○ /_chunks/...                         31.4 kB         53.6 kB
```

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [Tailwind CSS 文档](https://tailwindcss.com)
- [TypeScript 文档](https://www.typescriptlang.org)

## 📄 许可证

本项目为私有项目，未经授权不得使用或分发。

---

**AgentHub Team** © 2026
