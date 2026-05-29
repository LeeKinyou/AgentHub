# Phase 1：前端骨架 — AI 生成 29 个组件

> 时间：2026-05-27
> 状态：✅ 已完成

---

## 目标

构建仿飞书 IM 四栏布局，实现完整的前端交互骨架。

## 人机分工

| 任务 | 人类 | AI |
|------|------|-----|
| 四栏布局架构 | 确定布局方案 | 编写 `page.tsx` 主页面 + 4 个布局组件 |
| 会话管理 | 定义交互流程 | 编写 SessionSidebar、CreateGroupModal 等 |
| 消息渲染 | 确定卡片类型 | 编写 MessageCard、ArtifactPanel、CodeViewer |
| 输入交互 | 定义 @Mention 行为 | 编写 InputBar、MentionList、InputContextArea |
| 文件系统 | 确定 API 选型 | 编写 FileExplorer + File System Access API 集成 |
| 代码编辑器 | 确定功能需求 | 编写 CodeEditor + TabBar + Diff 视图 |

## 协作模式

```
人类：我需要一个仿飞书的四栏布局，左侧是项目图标坞...
AI：（生成 ProjectDock.tsx + ContextSidebar.tsx + ChatArea.tsx + AgentSidebar.tsx）

人类：消息气泡需要支持代码块卡片...
AI：（生成 MessageCard.tsx + ArtifactPanel.tsx + CodeViewer.tsx）

人类：@Mention 需要正则检测 + 键盘导航...
AI：（生成 MentionList.tsx + InputContextArea.tsx，实现完整的 @ 提及逻辑）
```

## 典型 Prompt

```
实现仿飞书的四栏 IM 布局：
- 左侧 ProjectDock（w-16）：项目图标坞
- ContextSidebar（可拖拽宽度）：文件树 + 会话列表
- ChatArea（核心画布）：ChatHeader + MessageList + InputBar
- AgentSidebar（可拖拽宽度）：Agent 面板或编辑器

使用 Next.js 14 + Tailwind CSS + TypeScript，暗黑 Zinc 色调。
```

## 交付物

| 类别 | 文件 |
|------|------|
| 布局组件 | ProjectDock、ContextSidebar、ChatArea、AgentSidebar |
| 会话管理 | SessionSidebar、CreateGroupModal、CreateSessionModal |
| 消息渲染 | MessageCard、ArtifactPanel、ArtifactPreview、CodeViewer |
| 输入交互 | InputBar、MentionList、InputContextArea |
| 文件系统 | FileExplorer、fileSystemUtils |
| 代码编辑 | CodeEditor、TabBar、useEditorTabs |
| 主题 | ThemeToggle、useTheme |
| Mock 数据 | mockData、mockProjects、mockFiles |

**合计**：29 个 React 组件 + 3 个自定义 Hook + 3 个 Mock 数据文件
