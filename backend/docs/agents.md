# agents/ - 智能体适配层

智能体系统的核心架构，包含适配器抽象、注册表、编排器和具体 LLM 适配器实现。

## 架构概览

```
                        ┌─────────────────┐
                        │   Orchestrator   │  多智能体编排
                        │  (LLM 规划)      │
                        └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │ Adapter A │ │ Adapter B │ │ Adapter C │  具体适配器
             └──────────┘ └──────────┘ └──────────┘
                    │
                    ▼
             ┌──────────┐
             │ MCP Tools │  工具调用
             └──────────┘
```

## 模块列表

| 文件 | 职责 |
|------|------|
| `base_adapter.py` | 适配器抽象基类 + 数据结构 |
| `registry.py` | 适配器注册表 + 工厂函数 |
| `orchestrator.py` | 多智能体编排器 |
| `providers/claude_code.py` | Anthropic Claude 适配器 |
| `providers/codex.py` | Codex 适配器 (预留) |
| `providers/opencode.py` | OpenCode 适配器 (预留) |
| `providers/custom.py` | 自定义适配器 (Anthropic/OpenAI + MCP) |

---

## base_adapter.py

### 数据结构

#### Message

```python
@dataclass
class Message:
    role: str    # "user" | "assistant" | "system"
    content: str
```

#### MessageChunk

流式消息块。

```python
@dataclass
class MessageChunk:
    chunk_type: str   # "text" | "code_diff" | "web_preview" | "deploy_status" | "tool_status"
    content: str      # 增量内容
    is_final: bool    # 是否最后一块
    agent_id: str = ""  # 智能体 ID
```

#### AgentStatusEvent

智能体状态事件。

```python
@dataclass
class AgentStatusEvent:
    agent_id: str
    status: str       # "analyzing" | "executing" | "completed" | "failed"
    display_text: str
```

### BaseAdapter (抽象基类)

```python
class BaseAdapter(ABC):
    @abstractmethod
    async def stream_chat(
        self,
        messages: list[Message],
        **kwargs,
    ) -> AsyncGenerator[MessageChunk, None]:
        """流式聊天接口，子类必须实现"""
        ...

    async def validate_messages(self, messages: list[Message]) -> bool:
        """验证消息格式 (默认实现)"""
        return all(m.role in ("user", "assistant", "system") for m in messages)
```

---

## registry.py

适配器类型注册表和工厂函数。

### 注册表

```python
ADAPTER_REGISTRY: dict[str, Type[BaseAdapter]] = {
    "claude_code": ClaudeCodeAdapter,
    "codex": CodexAdapter,
    "opencode": OpenCodeAdapter,
    "custom": CustomAdapter,
}
```

### get_adapter()

工厂函数，根据类型创建适配器实例。

```python
def get_adapter(adapter_type: str, agent_config: dict | None = None) -> BaseAdapter:
    if adapter_type not in ADAPTER_REGISTRY:
        raise ValueError(f"Unknown adapter type: {adapter_type}")
    if adapter_type == "custom":
        return CustomAdapter(agent_config=agent_config)
    return ADAPTER_REGISTRY[adapter_type]()
```

---

## orchestrator.py

多智能体编排器，使用 LLM 进行意图分析和任务分解。

### 核心流程

```
用户请求
    │
    ▼
┌───────────────────┐
│ 1. 单智能体?       │──是──▶ 直接委派 (快速路径)
│    (len==1)        │
└───────┬───────────┘
        │否
        ▼
┌───────────────────┐
│ 2. LLM 规划        │──失败──▶ 降级为单智能体 (第一个)
│    (Claude)        │
└───────┬───────────┘
        │成功
        ▼
┌───────────────────┐
│ 3. 单步计划?       │──是──▶ 直接委派
│    (len==1)        │
└───────┬───────────┘
        │否
        ▼
┌───────────────────┐
│ 4. 顺序执行        │
│    上下文传递       │
└───────────────────┘
```

### 数据结构

#### AgentDescriptor

智能体描述符，从数据库 AgentProfile 构建。

```python
@dataclass
class AgentDescriptor:
    agent_id: str
    name: str
    role: str
    adapter_type: str
    description: str | None = None
    system_prompt: str | None = None
    agent_config: dict | None = None
    skills: list[str] = field(default_factory=list)
```

#### PlanStep

执行计划中的一步。

```python
@dataclass
class PlanStep:
    agent_id: str  # 目标智能体 ID
    task: str      # 子任务描述
```

### Orchestrator 类

#### `process(session_id, user_content, agent_roster, conversation_history=None)`

主入口。返回 `AsyncGenerator[OrchestratorEvent]`，其中 `OrchestratorEvent = Union[MessageChunk, AgentStatusEvent]`。

#### `_plan_execution(user_content, agent_roster)`

调用 LLM (Claude) 分析用户意图，生成执行计划。

规划提示词要求 LLM 返回 JSON 数组:
```json
[
    {"agent_id": "uuid-1", "task": "审查代码风格"},
    {"agent_id": "uuid-2", "task": "检查安全漏洞"}
]
```

#### `_resolve_planner_credentials(agent_roster)`

选择规划用 LLM 的凭证:
1. 优先使用 `role="orchestrator"` 的智能体配置中的 `model` 和 `api_key`
2. 回退到全局 Settings 的 `ANTHROPIC_MODEL` 和 `ANTHROPIC_API_KEY`

#### `_delegate_single(agent, user_content, session_id, conversation_history=None)`

单智能体委派，流式转发输出。

#### `_execute_plan(steps, agent_roster, session_id, conversation_history=None)`

多步顺序执行，每步:
1. 发送 `analyzing` 状态
2. 构建上下文感知的任务提示 (包含前序输出)
3. 流式转发智能体输出
4. 累积输出供后续步骤使用

#### `_build_step_prompt(task, step_idx, steps, accumulated_outputs, accumulated_names)`

构建包含前序上下文的步骤提示:

```
Previous agent outputs for context:

--- Output from Agent A (step 1) ---
前序输出内容...

---

Your task:
当前步骤任务描述

(1 step(s) remain after yours)
```

### 清理

`cleanup()` 方法释放所有缓存的适配器资源 (如 MCP 子进程)。

---

## providers/claude_code.py

Anthropic Claude API 适配器。

- 使用 `anthropic.AsyncAnthropic` 客户端
- `client.messages.stream()` 流式接口
- 输出 `chunk_type="text"` 的 MessageChunk

---

## providers/codex.py / opencode.py

预留适配器，当前返回 stub 响应。待后续集成 Codex/OpenCode API。

---

## providers/custom.py

功能最丰富的适配器，支持 Anthropic 和 OpenAI 双 API + MCP 工具链。

### 初始化

```python
class CustomAdapter(BaseAdapter):
    def __init__(self, agent_config: dict | None = None):
        # 从 agent_config 读取: api_provider, api_key, base_url, model
        # 回退到全局 Settings 默认值
        # 初始化 Anthropic 或 OpenAI 客户端
        # MCP 管理器延迟初始化
```

### 配置属性

| 属性 | 来源 | 说明 |
|------|------|------|
| `system_prompt` | `agent_config.system_prompt` | 系统提示词 |
| `tools` | `agent_config.tools` | 用户自定义工具 |
| `skills` | `agent_config.skills` | 技能标签 |
| `mcp_servers` | `agent_config.mcp_servers` | MCP 服务器配置 |

### MCP 生命周期

```python
async def _ensure_mcp(self) -> MCPClientManager:
    """首次使用时延迟连接 MCP 服务器"""

async def close(self):
    """释放所有 MCP 子进程"""
```

### stream_chat() 流程

```
1. _ensure_mcp() — 延迟初始化 MCP
2. get_all_tools() — 获取 MCP 工具
3. _build_tools_payload() — 合并用户工具 + MCP 工具
4. 根据 api_provider 选择:
   - Anthropic -> _loop_anthropic()
   - OpenAI -> _loop_openai()
```

### 工具调用循环 (Tool Call Loop)

#### _loop_anthropic()

Anthropic API 工具调用循环:
1. 流式接收事件 (`content_block_start/delta/stop`)
2. 检测 `tool_use` 内容块
3. 执行工具 (`_execute_tool`)
4. 构建 `tool_result` 消息
5. 递归调用自身 (round_num + 1)
6. 直到无工具调用或达到 MAX_TOOL_ROUNDS

#### _loop_openai()

OpenAI API 工具调用循环:
1. 流式接收 chunks
2. 通过 `delta.tool_calls` 累积工具调用 (index-based map)
3. 执行工具
4. 构建 `tool` 角色消息
5. 递归调用自身

#### _execute_tool()

共享的工具执行逻辑:
- MCP 工具 -> `mcp.call_tool(name, args)`
- 未知工具 -> 返回错误信息
- 返回 `(result_text, is_error)`

### 工具格式转换

```python
# MCP 工具 -> Anthropic 格式
{"name": "...", "description": "...", "input_schema": {...}}

# MCP 工具 -> OpenAI 格式
{"type": "function", "function": {"name": "...", "description": "...", "parameters": {...}}}
```

### 防护机制

- `MAX_TOOL_ROUNDS = 10` — 防止无限工具调用循环
- MCP 初始化失败不阻塞主流程
- 工具执行异常被捕获并返回错误信息
