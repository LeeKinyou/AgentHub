# AgentHub

打造 IM 聊天式的多 Agent 协作平台，支持单聊、群聊、任务拆解、代码 Diff、网页预览及一键部署等全流程功能。

## 项目架构

```
AgentHub/
├── frontend/          # Next.js 14 + Tailwind CSS 前端
├── backend/           # FastAPI + SQLAlchemy (async) + PostgreSQL + Redis 后端
├── shared/            # 共享类型定义 & JSON Schema（pnpm workspace）
├── memory-bank/       # 项目文档 & 上下文记忆
├── package.json       # 根工作区配置
└── pnpm-workspace.yaml
```

## 技术栈

| 层级       | 技术                                                  |
| ---------- | ----------------------------------------------------- |
| 前端       | Next.js 14, React 18, Tailwind CSS, TypeScript        |
| 后端       | FastAPI, SQLAlchemy (async), uvicorn, Python 3.12+    |
| 数据库     | PostgreSQL (asyncpg)                                  |
| 缓存       | Redis (hiredis)                                       |
| LLM SDK    | Anthropic, OpenAI（兼容本地模型）                     |
| Agent 协议 | MCP (Model Context Protocol)                          |
| 包管理     | pnpm（前端/shared），uv（后端）                       |

## 环境要求

- **Node.js** >= 18
- **pnpm** >= 8
- **Python** >= 3.12
- **uv**（Python 包管理器）— [安装指南](https://docs.astral.sh/uv/)
- **PostgreSQL** 实例
- **Redis** 实例

## 快速开始

### 1. 克隆 & 安装

```bash
git clone https://github.com/LeeKinyou/AgentHub.git
cd AgentHub
```

### 2. 后端启动

```bash
cd backend

# 复制环境变量模板并填入你的配置
cp .env.example .env

# 安装依赖（基于 uv.lock 锁文件）
uv sync

# 启动开发服务器（热重载，端口 8000）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端首次启动时会自动创建数据库表（开发模式）。

### 3. 前端启动

```bash
# 在项目根目录执行
pnpm install

cd frontend
pnpm dev
```

前端运行在 `http://localhost:3000`。

### 4. 共享类型（可选）

```bash
# 从 JSON Schema 重新生成 TypeScript 类型
pnpm codegen
```

## 环境变量

详见 [`backend/.env.example`](backend/.env.example)，完整配置项如下：

| 变量               | 说明                             | 默认值                         |
| ------------------ | -------------------------------- | ------------------------------ |
| `DB_HOST`          | PostgreSQL 地址                  | `localhost`                    |
| `DB_PORT`          | PostgreSQL 端口                  | `5432`                         |
| `DB_USER`          | PostgreSQL 用户名                | `postgres`                     |
| `DB_PASSWORD`      | PostgreSQL 密码                  |                                |
| `DB_NAME`          | 数据库名称                       | `agenthub`                     |
| `REDIS_HOST`       | Redis 地址                       | `localhost`                    |
| `REDIS_PORT`       | Redis 端口                       | `6379`                         |
| `REDIS_PASSWORD`   | Redis 密码                       |                                |
| `ANTHROPIC_API_KEY`| Anthropic API 密钥               |                                |
| `ANTHROPIC_MODEL`  | Anthropic 模型 ID                | `claude-sonnet-4-20250514`     |
| `OPENAI_API_KEY`   | OpenAI API 密钥                  |                                |
| `OPENAI_MODEL`     | OpenAI 模型 ID                   | `gpt-4o`                       |
| `OPENAI_BASE_URL`  | OpenAI 兼容 API 地址             | `https://api.openai.com/v1`    |
| `CORS_ORIGINS`     | 允许的跨域来源（JSON 数组）      | `["http://localhost:3000"]`    |

如需使用本地模型（如 LM Studio），在 `.env` 中覆盖 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY` 即可。

## API 路由

所有后端接口统一前缀 `/api`：

| 路径               | 说明                         |
| ------------------ | ---------------------------- |
| `/api/users`       | 用户管理                     |
| `/api/sessions`    | 聊天会话（创建、列表）       |
| `/api/agents`      | Agent 配置 & 注册            |
| `/api/messages`    | 消息增删改查                 |
| `/api/websocket`   | WebSocket 实时通信           |
| `/health`          | 健康检查                     |

## Agent 适配器

AgentHub 通过适配器模式支持多种 Agent 后端：

- **Claude Code** — Anthropic Claude，基于 MCP 协议
- **Codex** — OpenAI Codex 集成
- **OpenCode** — 开源代码模型支持
- **Custom** — 可插拔的自定义 Agent 适配器

## 开发命令

```bash
# 后端测试
cd backend && uv run pytest

# 同步共享 Schema 到 TypeScript
pnpm sync:schemas

# 重新生成类型定义
pnpm codegen
```

## 许可证

私有项目。
