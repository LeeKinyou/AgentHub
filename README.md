# AgentHub

> 多 Agent 协作平台 — IM 聊天式交互，支持单聊、群聊、任务拆解、代码 Diff、网页预览及一键部署

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-%3E%3D3.12-3776AB.svg)](https://www.python.org/)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18-339933.svg)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

---

## 核心特性

| 特性 | 说明 |
|------|------|
| **IM 式交互** | 类飞书/微信的聊天界面，支持单聊和群聊，@提及 Agent |
| **多 Agent 协作** | Orchestrator 自动任务拆解 + 拓扑排序 + asyncio.gather 并行执行 |
| **实时流式通信** | WebSocket 双向通信，支持多轮对话、流式 chunk 推送、并发控制 |
| **代码协作** | 内置 Monaco Editor + Diff 引擎，支持代码对比、Accept/Reject |
| **沙箱预览** | iframe sandbox 安全隔离，Agent 生成的网页实时预览 |
| **选中即修改** | 在编辑器中选中代码 → 聊天输入修改指令 → Agent 精准修改 |
| **MCP 工具调用** | 基于 Model Context Protocol 的 Agent 通信，支持多轮工具调用 |
| **安全认证** | JWT 双 Token + bcrypt 密码加密 + Redis 黑名单 + Fernet 敏感字段加密 |
| **多模型支持** | 兼容 Anthropic Claude、OpenAI 及本地模型（LM Studio 等） |

---

## 项目架构

```
AgentHub/
├── frontend/              # Next.js 14 + Tailwind CSS 前端
│   ├── src/
│   │   ├── app/           # App Router 页面
│   │   ├── components/im/ # IM 聊天组件
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── stores/        # Zustand 状态管理
│   │   └── lib/           # 工具函数
│   └── e2e/               # Playwright E2E 测试
├── backend/               # FastAPI + SQLAlchemy (async) 后端
│   ├── app/
│   │   ├── routes/        # API 路由
│   │   ├── agents/        # Agent 适配器 + Orchestrator
│   │   ├── models/        # SQLAlchemy ORM 模型
│   │   ├── schemas/       # Pydantic 请求/响应 Schema
│   │   └── core/          # 配置、认证、加密、Redis
│   └── tests/             # 后端测试（24 个文件）
├── shared/                # 契约层（SSOT）
│   ├── schemas/           # JSON Schema 定义
│   └── types/             # TypeScript 类型（codegen 生成）
├── docs/                  # 项目文档
└── memory-bank/           # AI 协作记忆库
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 14 (App Router), React 18, Tailwind CSS, TypeScript |
| **状态管理** | Zustand (全局状态), WebSocket (实时通信) |
| **编辑器** | @monaco-editor/react (VS Code 同款编辑器) |
| **可视化** | @xyflow/react (ReactFlow 编排拓扑图) |
| **后端** | FastAPI, SQLAlchemy (async), uvicorn, Python 3.12+ |
| **数据库** | PostgreSQL (asyncpg) |
| **缓存** | Redis (hiredis) |
| **认证** | JWT, bcrypt, Fernet 加密 |
| **LLM SDK** | Anthropic, OpenAI（兼容本地模型） |
| **Agent 协议** | MCP (Model Context Protocol) |
| **Agent 编排** | 自研 Orchestrator (LLM 规划 + 拓扑排序并行执行) |
| **包管理** | pnpm (前端/shared), uv (后端) |
| **测试** | pytest (后端), Vitest (前端单元), Playwright (E2E) |

---

## 快速开始

### 环境要求

- **Node.js** >= 18 + **pnpm** >= 8
- **Python** >= 3.12 + **uv** — [安装指南](https://docs.astral.sh/uv/)
- **PostgreSQL** 实例
- **Redis** 实例

### 1. 克隆 & 安装

```bash
git clone https://github.com/LeeKinyou/AgentHub.git
cd AgentHub
pnpm install
```

### 2. 后端启动

```bash
cd backend

# 复制环境变量模板并填入你的配置
cp .env.example .env

# 安装依赖
uv sync

# 启动开发服务器（热重载，端口 8000）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 前端启动

```bash
cd frontend
pnpm dev
```

前端运行在 `http://localhost:3000`。

### 4. 共享类型（可选）

```bash
# 从 JSON Schema 重新生成 TypeScript 类型
pnpm codegen
```

---

## 环境变量

详见 [`backend/.env.example`](backend/.env.example)：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | PostgreSQL 地址 | `localhost` |
| `DB_PORT` | PostgreSQL 端口 | `5432` |
| `DB_USER` | PostgreSQL 用户名 | `postgres` |
| `DB_PASSWORD` | PostgreSQL 密码 | — |
| `DB_NAME` | 数据库名称 | `agenthub` |
| `REDIS_HOST` | Redis 地址 | `localhost` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | — |
| `OPENAI_API_KEY` | OpenAI API 密钥 | — |
| `OPENAI_BASE_URL` | OpenAI 兼容 API 地址 | `https://api.openai.com/v1` |

---

## API 路由

所有后端接口统一前缀 `/api`：

| 路径 | 说明 |
|------|------|
| `/api/auth` | 认证接口（注册、登录、刷新、登出） |
| `/api/users` | 用户管理 |
| `/api/agents` | Agent 配置 & 注册 |
| `/api/sessions` | 聊天会话 CRUD |
| `/api/sessions/{id}/messages` | 消息增删改查 |
| `/api/upload` | 文件上传（10MB 限制） |
| `/api/deploy` | 部署管理 |
| `/ws?session_id={id}&token={jwt}` | WebSocket 实时通信 |
| `/health` | 健康检查 |

---

## Agent 适配器

AgentHub 通过适配器模式支持多种 Agent 后端：

| 适配器 | 说明 |
|--------|------|
| **ClaudeCode** | Anthropic Claude，基于 Anthropic SDK |
| **Codex** | OpenAI Codex 集成 |
| **OpenCode** | 开源代码模型支持 |
| **Custom** | 可插拔的自定义 Agent，支持 MCP 工具调用循环 |

---

## 测试

```bash
# 后端测试（24 个测试文件，2911 行）
cd backend && uv run pytest

# 后端测试覆盖率
cd backend && uv run pytest --cov=app --cov-report=html

# 前端单元测试（25 个用例）
cd frontend && pnpm test

# 前端 E2E 测试
cd frontend && pnpm test:e2e
```

---

## 项目文档

| 文档 | 说明 |
|------|------|
| [课题要求](docs/00-课题要求/) | 课程课题要求与评分标准 |
| [产品需求文档](docs/01-PRD/) | PRD v1.0 |
| [架构设计](docs/02-架构设计/) | 系统架构说明 (v1.0 & v2.0) |
| [AI 协作记录](docs/03-AI协作记录/) | 人机协作开发全过程记录 |
| [代码审查](docs/04-代码审查/) | 3 轮代码审查报告 |
| [测试报告](docs/05-测试报告/) | 后端测试报告 |
| [前端文档](docs/06-Frontend/) | 前端组件树、状态管理、WebSocket 流 |
| [共享 Schema](shared/schemas/) | 前后端契约定义 (SSOT) |
| [贡献指南](CONTRIBUTING.md) | 开发环境 & 提交流程 |
| [变更日志](CHANGELOG.md) | 版本变更记录 |

---

## 许可证

[Apache License 2.0](LICENSE)。
