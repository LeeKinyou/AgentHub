# AgentHub Backend

多智能体协作平台后端服务。基于 FastAPI + SQLAlchemy + PostgreSQL 构建，支持多 Agent 编排、MCP 工具链调用、实时 WebSocket 通信和代码 Diff 应用。

## 技术栈

| 层级 | 技术 |
|------|------|
| Web 框架 | FastAPI (ASGI) |
| ORM | SQLAlchemy 2.0 (async) |
| 数据库 | PostgreSQL (asyncpg) |
| 数据校验 | Pydantic v2 |
| LLM SDK | Anthropic / OpenAI |
| 工具协议 | MCP (Model Context Protocol) |
| 实时通信 | WebSocket |
| 异步文件 | aiofiles |

## 项目结构

```
backend/
├── app/
│   ├── main.py              # FastAPI 应用入口
│   ├── core/                # 核心基础设施
│   │   ├── config.py        # 配置管理 (Pydantic Settings)
│   │   ├── database.py      # 数据库引擎与会话
│   │   ├── diff_engine.py   # 安全 Diff/Patch 引擎
│   │   ├── exception_handler.py  # WebSocket 异常处理
│   │   └── mcp_manager.py   # MCP 客户端管理器
│   ├── models/              # SQLAlchemy ORM 模型
│   │   ├── user.py          # 用户模型
│   │   ├── agent_profile.py # 智能体配置模型
│   │   ├── session.py       # 会话模型
│   │   └── message.py       # 消息模型
│   ├── schemas/             # Pydantic 数据校验
│   │   ├── common.py        # 通用响应封装
│   │   ├── user.py          # 用户 CRUD Schema
│   │   ├── agent.py         # 智能体 Schema
│   │   ├── session.py       # 会话 Schema
│   │   ├── message.py       # 消息 + 卡片数据 Schema
│   │   └── ws.py            # WebSocket 消息 Schema
│   ├── routes/              # API 路由
│   │   ├── users.py         # /api/users
│   │   ├── sessions.py      # /api/users/{id}/sessions
│   │   ├── agents.py        # /api/agents
│   │   ├── messages.py      # /api/sessions/{id}/messages
│   │   └── websocket.py     # /ws (WebSocket)
│   └── agents/              # 智能体适配层
│       ├── base_adapter.py  # 适配器抽象基类
│       ├── registry.py      # 适配器注册表
│       ├── orchestrator.py  # 多智能体编排器
│       └── providers/       # 具体适配器实现
│           ├── claude_code.py
│           ├── codex.py
│           ├── opencode.py
│           └── custom.py
├── tests/                   # 测试套件
├── docs/                    # 子模块文档
├── pyproject.toml           # 项目元数据与依赖
└── .env                     # 环境变量 (不入版本控制)
```

## 快速开始

### 1. 环境要求

- Python >= 3.12
- PostgreSQL >= 14
- Node.js (用于 MCP 服务器，可选)

### 2. 安装依赖

```bash
cd backend
pip install -e ".[dev]"
# 或使用 uv
uv sync
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，填入实际值：

```bash
cp .env.example .env
```

关键配置项：

```env
# 数据库
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=agenthub

# LLM API
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# 工作区 (Diff 引擎使用)
WORKSPACE_ROOT=/path/to/workspace
```

### 4. 启动服务

```bash
# 开发模式 (自动重载)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

服务启动后自动创建数据库表。

### 5. 运行测试

```bash
pytest tests/ -v
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET/POST | `/api/users` | 用户列表 / 创建 |
| GET/PATCH/DELETE | `/api/users/{id}` | 用户详情 / 更新 / 删除 |
| GET/POST | `/api/users/{id}/sessions` | 会话列表 / 创建 |
| GET/PATCH/DELETE | `/api/users/{id}/sessions/{sid}` | 会话操作 |
| GET/POST | `/api/agents` | 智能体列表 / 创建 |
| GET/PATCH/DELETE | `/api/agents/{id}` | 智能体操作 |
| GET | `/api/sessions/{id}/messages` | 消息列表 (游标分页) |
| WS | `/ws?session_id={id}` | 实时通信 |

## WebSocket 协议

连接地址: `ws://localhost:8000/ws?session_id={session_id}`

### 客户端 -> 服务端

```json
{"type": "ping", "timestamp": "..."}

{"type": "sendMessage", "payload": {"content": "你好"}}

{"type": "triggerAction", "payload": {"actionType": "applyDiff", "messageId": "..."}}
```

### 服务端 -> 客户端

```json
{"type": "pong", "timestamp": "..."}

{"type": "agentStatus", "payload": {"agentId": "...", "status": "executing", "displayText": "..."}}

{"type": "messageChunk", "payload": {"chunkType": "text", "deltaContent": "...", "isFinal": false}}

{"type": "messageComplete", "payload": {"id": "...", "content": "..."}}

{"type": "actionResult", "payload": {"actionType": "applyDiff", "status": "applied"}}

{"type": "error", "payload": {"errorCode": "...", "errorMessage": "...", "recoverable": true}}
```

## 子模块文档

- [core/ - 核心基础设施](core.md)
- [models/ - 数据库模型](models.md)
- [schemas/ - 数据校验 Schema](schemas.md)
- [routes/ - API 路由](routes.md)
- [agents/ - 智能体适配层](agents.md)
- [tests/ - 测试套件](tests.md)
