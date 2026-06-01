# AgentHub — 提示词模板库

> 本文档收录了项目开发过程中使用的典型 AI Prompt。
> 完整模板库见 `memory-bank/prompts.md`。

---

## 一、设计阶段 Prompt

### 1.1 产品设计

```
请为一个名为 AgentHub 的多 Agent 协作平台撰写产品设计文档，要求：
1. 产品定位：IM 聊天式的多 Agent 协作平台
2. 核心交互：单聊模式 + 群聊模式
3. 产物展示：代码 Diff、网页预览、部署状态等富媒体卡片
4. 上下文管理：聊天历史 + Pin 消息机制

请包含完整的用户旅程和消息流示例。
```

### 1.2 架构设计

```
请为以下技术栈设计系统架构：
- 前端：Next.js 14 + Tailwind CSS
- 后端：FastAPI + SQLAlchemy (async)
- 数据库：PostgreSQL + Redis
- 通信：WebSocket 双向协议

要求：
1. 定义三层 Monorepo 的依赖关系
2. 设计 WebSocket 双向报文格式（JSON Schema）
3. 设计统一适配器模式（BaseAdapter）
4. 绘制 Mermaid 架构图
```

### 1.3 WebSocket 协议设计

```
请设计 WebSocket 双向通信协议，要求：
- 客户端可以发送：ping、用户消息、触发 action（如 applyDiff）
- 服务端可以推送：pong、Agent 状态、消息 chunk、完整消息、错误
- 所有消息必须有 type + timestamp + payload 结构
- 请输出 JSON Schema Draft-07 格式
```

---

## 二、开发阶段 Prompt

### 2.1 前端组件开发

```
实现仿飞书的四栏 IM 布局：
- 左侧 ProjectDock（w-16）：项目图标坞
- ContextSidebar（可拖拽宽度）：文件树 + 会话列表
- ChatArea（核心画布）：ChatHeader + MessageList + InputBar
- AgentSidebar（可拖拽宽度）：Agent 面板或编辑器

使用 Next.js 14 + Tailwind CSS + TypeScript，暗黑 Zinc 色调。
```

### 2.2 文件拖拽联动

```
实现 FileExplorer 文件节点拖拽到 InputBar 的功能：
- FileExplorer 的文件节点设置 draggable + onDragStart 设置 DataTransfer
- InputBar 上方显示 Drop 接收区，靛蓝虚线高亮视觉反馈
- 拖拽成功后在 InputContextArea 生成 Context 胶囊
- 需要去重检查
```

### 2.3 后端 Agent 适配器

```
实现 CustomAdapter，要求：
1. 支持 Anthropic 和 OpenAI 两种 API
2. 支持 MCP 工具调用（懒加载连接）
3. 工具调用循环最多 10 轮
4. 流式输出消息 chunk
5. 继承 BaseAdapter 抽象基类
```

---

## 三、审查阶段 Prompt

### 3.1 代码审查

```
阅读整个项目的后端并评价一下，指出哪里逻辑有问题，
哪里还有改进空间，并写成一个 md 文档。

审查范围：
- 所有 routes/、schemas/、models/、core/、agents/ 下的文件
- 测试配置和测试用例
- 配置文件和依赖声明
```

### 3.2 文档结构建议

```
这个项目是参赛项目，评分标准中 AI 协作能力占 30% 权重。
请查看现有文档结构，建议如何组织这些文档以最大化得分，
特别是如何展示 AI 协作的证据。
```

---

## 四、任务场景模板

### Bug 修复

```
请帮我分析并修复以下问题：
问题描述：{bug_description}
复现步骤：{reproduction_steps}
预期行为：{expected_behavior}
实际行为：{actual_behavior}
```

### 功能开发

```
请帮我实现以下功能需求：
功能名称：{feature_name}
功能描述：{feature_description}
技术要求：{technical_requirements}
约束条件：{constraints}
```

### 任务拆解

```
你是一个任务拆解专家，负责将复杂需求分解为可执行的子任务。
输入：用户的原始需求描述
输出格式：
任务清单：
1. [任务名称] - 预估复杂度：高/中/低
   - 描述：具体任务内容
   - 依赖：前置任务编号
   - 产出：预期交付物
```
