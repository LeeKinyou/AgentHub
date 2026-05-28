# core/ - 核心基础设施

本模块包含应用的底层基础设施：配置管理、数据库连接、Diff 引擎、异常处理和 MCP 客户端。

## 模块列表

| 文件 | 职责 |
|------|------|
| `config.py` | 全局配置管理 |
| `database.py` | 数据库引擎与会话工厂 |
| `diff_engine.py` | 安全的代码 Diff/Patch 引擎 |
| `exception_handler.py` | WebSocket 异常处理 |
| `mcp_manager.py` | MCP 协议客户端管理器 |

---

## config.py

使用 `pydantic-settings` 的 `BaseSettings` 管理所有配置，自动从环境变量和 `.env` 文件加载。

### Settings 类

```python
class Settings(BaseSettings):
    PROJECT_NAME: str = "AgentHub"
    API_V1_PREFIX: str = "/api"

    # PostgreSQL
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    DB_NAME: str = "agenthub"

    # Redis (预留)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"

    # 工作区
    WORKSPACE_ROOT: str = ""

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
```

### 计算属性

- `DATABASE_URL` -> `postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}`
- `REDIS_URL` -> `redis://[:password@]{host}:{port}/{db}`

### 使用方式

```python
from app.core.config import get_settings

settings = get_settings()  # 全局缓存，多次调用返回同一实例
print(settings.ANTHROPIC_MODEL)
```

---

## database.py

SQLAlchemy 异步引擎和会话管理。

### 核心组件

- **`engine`** — 异步数据库引擎 (`create_async_engine`)
- **`async_session`** — 会话工厂 (`async_sessionmaker`)
- **`Base`** — 所有 ORM 模型的声明式基类
- **`get_db()`** — FastAPI 依赖注入函数，自动提交/回滚

### get_db() 生命周期

```python
async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session        # 路由函数执行
            await session.commit()  # 成功则提交
        except Exception:
            await session.rollback()  # 异常则回滚
            raise
```

### 使用方式

```python
from app.core.database import get_db

@router.get("/items")
async def list_items(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Item))
    return result.scalars().all()
```

---

## diff_engine.py

安全的代码差异应用引擎，用于将 LLM 生成的 Diff 应用到工作区文件。

### 安全特性

1. **路径穿越防护** — `Path.relative_to()` 确保目标文件在工作区根目录内
2. **内存备份 + 自动回滚** — 写入失败时恢复原始内容
3. **Hunk 重叠检测** — 应用前检查多个 Hunk 是否冲突
4. **新文件创建** — `oldStart == 0` 表示创建新文件
5. **异步 I/O** — 使用 `aiofiles` 进行非阻塞文件操作

### DiffHunk 数据结构

```python
{
    "oldStart": 10,      # 原文件起始行 (1-based, 0=新文件)
    "oldLines": 5,       # 原文件替换行数
    "newStart": 10,      # 新文件起始行
    "newLines": 7,       # 新文件行数
    "content": "new code content..."  # 替换内容
}
```

### 核心函数

#### `apply_diff(workspace_root, file_path, diff_hunks)`

主入口。返回 `(success: bool, detail: str)`。

处理流程:
1. 路径安全检查 (`_resolve_safe_path`)
2. Hunk 重叠检测 (`_check_hunk_overlap`)
3. 读取文件内容 (或初始化空文件)
4. 创建内存备份
5. 从底部向顶部应用 Hunk (保持行号有效)
6. 写入磁盘，失败则回滚

#### `apply_diff_to_file(file_path, hunks, workspace_root=None)`

便捷包装，自动从 `settings.WORKSPACE_ROOT` 获取工作区路径。

### 异常类型

- **`DiffConflictError`** — Hunk 的目标范围与文件内容不匹配

### 使用示例

```python
from app.core.diff_engine import apply_diff_to_file

success, detail = await apply_diff_to_file(
    "src/main.py",
    [{"oldStart": 1, "oldLines": 3, "newStart": 1, "newLines": 3, "content": "new code"}]
)
```

---

## exception_handler.py

WebSocket 连接的全局异常处理器。

### GlobalExceptionHandler

静态工具类，将异常转换为结构化的错误消息通过 WebSocket 发送给前端。

#### `handle_exception(websocket, session_id, exception)`

处理流程:
1. `_classify_error(exception)` — 错误分类
   - `TimeoutError` -> `"TIMEOUT"`
   - `ConnectionError` -> `"CONNECTION_ERROR"`
   - 其他 -> `"UNKNOWN_ERROR"`
2. `_is_recoverable(exception)` — 判断是否可恢复
   - `TimeoutError` / `ConnectionError` -> `True`
   - 其他 -> `False`
3. 构建错误卡片 JSON 并通过 `websocket.send_json()` 发送

#### 错误消息格式

```json
{
    "type": "error",
    "timestamp": "2026-05-28T12:00:00Z",
    "payload": {
        "sessionId": "...",
        "errorCode": "TIMEOUT",
        "errorMessage": "...",
        "recoverable": true
    }
}
```

---

## mcp_manager.py

MCP (Model Context Protocol) 客户端管理器，使用官方 `mcp` Python SDK。

### 架构概览

```
MCPClientManager
├── MCPServerConnection (server A)
│   ├── subprocess (npx ...)
│   ├── ClientSession
│   └── MCPTool[]
├── MCPServerConnection (server B)
│   ├── subprocess (python ...)
│   ├── ClientSession
│   └── MCPTool[]
└── _tool_map: {tool_name -> connection}
```

### MCPTool

工具描述数据类，支持序列化为 Anthropic 和 OpenAI 格式。

```python
@dataclass
class MCPTool:
    name: str
    description: str
    input_schema: dict
    server_name: str

    def to_anthropic_tool(self) -> dict  # -> {name, description, input_schema}
    def to_openai_tool(self) -> dict     # # -> {type: "function", function: {...}}
```

### MCPServerConnection

管理单个 MCP 服务器子进程。

#### 生命周期

1. `connect()` — 启动子进程、MCP 握手、发现工具
2. `_run_context_manager()` — 后台任务，保持 `stdio_client` 和 `ClientSession` 上下文存活
3. `call_tool(name, args)` — 执行工具调用
4. `disconnect()` — 信号 `_disconnect_event`，关闭上下文管理器，终止子进程

#### 子进程管理

使用 `asyncio.Event` 信号机制：
- `_disconnect_event` 在 `disconnect()` 时被 set
- `_run_context_manager` 中 `await self._disconnect_event.wait()` 阻塞直到收到信号
- 退出 `async with stdio_client(...)` 时自动清理子进程和管道

### MCPClientManager

管理多个 MCP 服务器连接的统一接口。

#### 核心方法

| 方法 | 说明 |
|------|------|
| `connect_all(configs)` | 并发连接所有配置的 MCP 服务器 |
| `call_tool(name, args)` | 路由工具调用到正确的服务器 |
| `get_all_tools()` | 返回所有已发现的工具列表 |
| `has_tool(name)` | 检查工具是否可用 |
| `disconnect_all()` | 关闭所有连接并终止子进程 |

#### 配置格式

```python
server_configs = [
    {
        "name": "filesystem",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
        "env": {"NODE_ENV": "production"}  # 可选
    },
    {
        "name": "custom-server",
        "command": "python",
        "args": ["-m", "my_mcp_server"],
    }
]
```

#### 使用示例

```python
from app.core.mcp_manager import MCPClientManager

manager = MCPClientManager()
tools = await manager.connect_all(server_configs)

# 执行工具调用
result = await manager.call_tool("read_file", {"path": "/workspace/main.py"})
# result = {"content": [{"type": "text", "text": "..."}], "isError": False}

await manager.disconnect_all()
```

### 常量

- `MAX_TOOL_ROUNDS = 10` — 工具调用循环最大轮数，防止无限循环
