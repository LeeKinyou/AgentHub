# AgentHub Backend

AgentHub 多 Agent 协作平台后端服务，基于 FastAPI + SQLAlchemy (async) + PostgreSQL + Redis 构建。

## 技术栈

- **框架**: FastAPI + Pydantic v2
- **数据库**: PostgreSQL (asyncpg)
- **缓存**: Redis (hiredis)
- **ORM**: SQLAlchemy 2.0 (async)
- **Agent 编排**: LangGraph
- **LLM SDK**: Anthropic, OpenAI
- **协议**: MCP (Model Context Protocol)
- **认证**: JWT + bcrypt
- **包管理**: uv

## 项目结构

```
backend/
├── app/
│   ├── agents/          # Agent 编排 & 适配器
│   │   ├── orchestrator.py    # 多 Agent 编排器
│   │   └── registry.py        # Agent 注册表
│   ├── core/            # 核心模块
│   │   ├── auth.py            # JWT 认证
│   │   ├── config.py          # 配置管理
│   │   ├── crypto.py          # 加密工具
│   │   ├── database.py        # 数据库连接
│   │   ├── diff_engine.py     # Diff 引擎
│   │   ├── exception_handler.py # 异常处理
│   │   ├── mcp_manager.py     # MCP 连接管理
│   │   └── redis.py           # Redis 连接
│   ├── models/          # SQLAlchemy 模型
│   ├── routes/          # API 路由
│   │   ├── agents.py          # Agent 管理
│   │   ├── auth.py            # 认证接口
│   │   ├── messages.py        # 消息管理
│   │   ├── sessions.py        # 会话管理
│   │   ├── users.py           # 用户管理
│   │   └── websocket.py       # WebSocket 通信
│   ├── schemas/         # Pydantic Schema
│   └── main.py          # 应用入口
├── tests/               # 测试套件
│   ├── agents/          # Agent 测试
│   ├── auth/            # 认证测试
│   ├── models/          # 模型测试
│   ├── routes/          # 路由测试
│   ├── security/        # 安全测试
│   └── websocket/       # WebSocket 测试
├── docs/                # 后端文档
├── pyproject.toml       # 项目配置 & 依赖
└── uv.lock              # 依赖锁文件
```

## 快速开始

### 1. 环境准备

- Python >= 3.12
- PostgreSQL 实例
- Redis 实例
- uv 包管理器

### 2. 安装依赖

```bash
cd backend

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的配置
# vim .env

# 安装依赖
uv sync
```

### 3. 启动服务

```bash
# 开发模式（热重载）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

服务启动后访问 `http://localhost:8000/docs` 查看 API 文档。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | PostgreSQL 地址 | `localhost` |
| `DB_PORT` | PostgreSQL 端口 | `5432` |
| `DB_USER` | PostgreSQL 用户名 | `postgres` |
| `DB_PASSWORD` | PostgreSQL 密码 | - |
| `DB_NAME` | 数据库名称 | `agenthub` |
| `REDIS_HOST` | Redis 地址 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | - |
| `REDIS_DB` | Redis 数据库 | `0` |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | - |
| `ANTHROPIC_MODEL` | Anthropic 模型 ID | `claude-sonnet-4-20250514` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `OPENAI_MODEL` | OpenAI 模型 ID | `gpt-4o` |
| `OPENAI_BASE_URL` | OpenAI 兼容 API 地址 | `https://api.openai.com/v1` |
| `CORS_ORIGINS` | 允许的跨域来源 | `["http://localhost:3000"]` |

## API 路由

所有 REST 接口统一前缀 `/api`：

| 路径 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/refresh` | POST | 刷新 Token |
| `/api/auth/logout` | POST | 登出 (Token 黑名单) |
| `/api/auth/me` | GET | 获取当前用户信息 |
| `/api/users` | GET/POST | 用户列表/创建 (需认证) |
| `/api/users/{id}` | GET/PATCH/DELETE | 用户 CRUD |
| `/api/users/{user_id}/sessions` | GET/POST | 会话列表/创建 |
| `/api/users/{user_id}/sessions/{sid}` | GET/PATCH/DELETE | 会话 CRUD |
| `/api/agents` | GET/POST | Agent 列表/创建 |
| `/api/agents/{id}` | GET/PATCH/DELETE | Agent CRUD |
| `/api/sessions/{session_id}/messages` | GET | 消息列表 (游标分页) |
| `/ws?session_id={id}&token={jwt}` | WebSocket | 实时通信 (需认证) |
| `/health` | GET | 健康检查 |

## 测试

```bash
# 运行所有测试
uv run pytest

# 运行特定模块测试
uv run pytest tests/auth/
uv run pytest tests/routes/
uv run pytest tests/websocket/

# 生成测试覆盖率报告
uv run pytest --cov=app --cov-report=html
```

## 开发规范

1. **Schema 优先**: 修改接口前先更新 `shared/schemas/` 下的契约定义
2. **字段命名**: JSON 传输用 camelCase，Pydantic 内部用 snake_case
3. **异步优先**: 所有数据库操作使用 async/await
4. **类型安全**: 使用 Pydantic v2 进行数据验证

## 架构设计

### 认证流程

1. 用户注册/登录获取 JWT Token
2. 后续请求在 Header 中携带 `Authorization: Bearer <token>`
3. WebSocket 连接通过 query 参数 `token` 传递

### Agent 编排

- 支持单 Agent 和多 Agent 并行执行
- 通过拓扑排序确定执行顺序
- 使用 asyncio.gather 实现并行调度

### WebSocket 协议

双向消息格式：

```json
{
  "type": "message_type",
  "payload": { ... }
}
```

详见 `shared/schemas/ws_messages.json`。

## 相关文档

- [架构设计文档](../docs/02-架构设计/)
- [代码审查报告](../docs/04-代码审查/)
- [共享 Schema 定义](../shared/schemas/)
