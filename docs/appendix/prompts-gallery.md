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

---

## 五、人机协作深度场景

### 5.1 Orchestrator 任务规划 Prompt

**场景**：用户在群聊中输入复杂需求，Orchestrator 需要拆解为多 Agent 协作计划。

**人类输入**：
```
我需要为这个项目添加用户认证功能，包括注册、登录、JWT token 管理，
以及中间件保护路由。请规划执行方案。

可用 Agent 名册：
- Claude (expert): 擅长代码生成与架构设计
- Codex (expert): 擅长代码补全与重构
- SecurityBot (expert): 擅长安全审计与漏洞检测
```

**AI 输出摘要**：
```json
{
  "plan": "用户认证系统实现",
  "steps": [
    {
      "id": 1,
      "agent": "Claude",
      "task": "设计 User 模型和认证 Schema",
      "output": "models/user.py, schemas/auth.py",
      "dependencies": []
    },
    {
      "id": 2,
      "agent": "Claude",
      "task": "实现 JWT encode/decode + bcrypt 密码哈希",
      "output": "core/security.py",
      "dependencies": [1]
    },
    {
      "id": 3,
      "agent": "Codex",
      "task": "实现认证路由 register/login/refresh/logout",
      "output": "routes/auth.py",
      "dependencies": [1, 2]
    },
    {
      "id": 4,
      "agent": "SecurityBot",
      "task": "审查认证实现的安全性",
      "output": "安全审查报告",
      "dependencies": [3]
    }
  ]
}
```

**人机迭代**：
- 人类审查：建议将 SecurityBot 审查提前到路由实现之前，避免返工
- AI 调整：重新编排依赖图，让 SecurityBot 在 step 2 完成后即审查 core/security.py
- 人类确认：执行调整后的计划

### 5.2 安全审查 Prompt

**场景**：让 AI 审查 WebSocket 路由代码中的安全漏洞。

**人类输入**：
```
请审查以下 WebSocket 路由代码的安全性，重点关注：
1. 认证与授权
2. 输入校验
3. Rate limiting
4. 资源消耗防护

代码路径：backend/app/routes/websocket.py

```python
@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    # ... 处理消息
```
```

**AI 输出摘要**：
发现 3 个安全问题：
1. **缺少认证**：WebSocket 连接未验证 JWT token，任何人可连接
2. **缺少 Rate Limiting**：无消息频率限制，可被 Flood 攻击
3. **session_id 未校验**：未验证 session_id 格式（应为 UUID）且未检查用户是否有权访问该 session

建议修复：
- 在 accept() 前验证 token
- 添加消息计数器 + 滑动窗口限流
- 使用 Pydantic 校验 session_id 格式

**人机迭代**：
- 人类反馈：除了修复，还需要添加连接数上限（每个用户最多 5 个并发连接）
- AI 补充：在连接管理器中添加 per-user 连接计数，超出时返回 429

### 5.3 架构设计 Spec 协作 Prompt

**场景**：人类提出需求，AI 输出架构 Spec，经过多轮迭代确定方案。

**人类输入**：
```
设计一个可插拔的多 Agent 调度器，要求：
1. 支持单 Agent 直接执行和多 Agent 并行执行
2. Agent 之间可以有依赖关系（如 Agent B 需要 Agent A 的输出）
3. 支持动态添加新的 Agent 类型（适配器模式）
4. 执行过程需要实时推送到前端

请先输出架构设计 Spec，我来审查。
```

**AI 输出 Spec 摘要**：
```
## Orchestrator 架构 Spec

### 核心组件
- AgentRegistry: 管理所有已注册的 Agent 适配器
- ExecutionPlanner: LLM 驱动的任务规划器
- DependencyGraph: DAG 依赖图 + 拓扑排序
- TaskExecutor: 异步任务执行器（asyncio.gather 并行）

### 数据流
用户消息 → Orchestrator.analyze_intent()
  → LLM 生成 JSON 执行计划
  → 构建 DependencyGraph
  → 拓扑排序得到执行层级
  → 每层 Agent 并行执行
  → 结果聚合 → 推送前端
```

**人机迭代**：
- 第一轮：人类指出缺少错误恢复机制（某个 Agent 失败不应阻塞整个流程）
- AI 更新：添加 fallback 策略 — 单个 Agent 超时/失败时跳过并记录，不阻塞后续步骤
- 第二轮：人类要求支持 Agent 间消息传递（不只是依赖输出）
- AI 更新：添加 AgentMessageBus，Agent 可以 publish/subscribe 消息通道

### 5.4 UI 组件设计 Prompt

**场景**：用 AI 生成符合苹果极简风格的 UI 组件。

**人类输入**：
```
设计一个消息卡片组件 MessageCard，遵循以下 UI 规范：

## 设计规范
- 核心理念：少即是多，克制是最高级的美感
- 禁止：霓虹渐变、发光效果、厚重阴影、大圆角
- 色彩：背景纯白 #FFFFFF，主文本 #1D1D1F，辅助 #86868B
- 强调色：仅 #0071E3，极度克制
- 边框：极浅灰 #D2D2D7，仅 1px
- 字体：-apple-system 栈，行高 1.5-1.6
- 动效：transition-all duration-300 ease-in-out，仅允许淡入

## 功能需求
- 区分用户消息（右对齐，蓝色气泡）和 Agent 消息（左对齐，白色气泡）
- 支持 Markdown 渲染
- 支持代码块缩略展示
- hover 时显示操作栏（复制、回复、引用、Pin）

请输出 React + Tailwind 组件代码。
```

**AI 输出摘要**：
```tsx
// 核心结构
<div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
  <div className="w-8 h-8 rounded-full bg-minimal-bg border border-minimal-border
    flex items-center justify-center text-sm shrink-0">
    {sender.avatar}
  </div>
  <div className={`max-w-[75%] ...`}>
    <div className="px-3 py-2 rounded-lg text-sm
      ${isUser ? 'bg-minimal-accent text-white'
               : 'bg-white/80 backdrop-blur-sm border border-minimal-border ...'}">
      <MarkdownRenderer content={textContent} />
    </div>
    {/* 操作栏 — hover 渐显 */}
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      {/* 复制 · 回复 · 引用 · Pin */}
    </div>
  </div>
</div>
```

**人机迭代**：
- 人类反馈：操作栏的 translate-y 动画太明显，改为仅 opacity 变化
- AI 调整：移除 translate-y class，仅保留 opacity-0 → opacity-100
- 人类确认：符合克制风格，通过
