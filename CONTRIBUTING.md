# 参与 AgentHub 开发

本指南涵盖开发工作流、编码规范和项目约定。

## 开发环境搭建

### 前置条件

- **Python** >= 3.12
- **uv**（Python 包管理器）-- [安装指南](https://docs.astral.sh/uv/)
- **Node.js** >= 18
- **pnpm** >= 8
- **PostgreSQL** 实例
- **Redis** 实例

### 后端搭建

```bash
cd backend

# 复制环境变量模板
cp .env.example .env
# 编辑 .env，填入数据库/Redis/API 凭据

# 安装依赖
uv sync

# 启动开发服务器（热重载，端口 8000）
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端搭建

```bash
# 在项目根目录
pnpm install

cd frontend
pnpm dev
```

前端运行在 `http://localhost:3000`。

### 共享类型（可选）

```bash
# 从 JSON Schema 重新生成 TypeScript 类型
pnpm codegen
```

## 分支策略

- `main` -- 生产就绪代码，稳定版本
- 功能分支 -- `feature/<name>` 或 `fix/<name>`，从 `main` 分出
- 所有变更通过 Pull Request 合并到 `main`

## 提交信息约定

我们遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**类型：**

- `feat` -- 新功能
- `fix` -- 缺陷修复
- `docs` -- 仅文档变更
- `refactor` -- 既不修复缺陷也不添加功能的代码变更
- `test` -- 添加或更新测试
- `chore` -- 构建流程、工具、依赖变更
- `perf` -- 性能优化

**示例：**

```
feat(backend): add message reply support with replyToId
fix(websocket): correct agent status lifecycle on disconnect
docs: add WebSocket protocol documentation
test(backend): add tests for session CRUD endpoints
```

## Pull Request 流程

1. 从 `main` 创建功能分支
2. 按照下方的编码规范进行开发
3. 运行测试：`cd backend && uv run pytest`
4. 向 `main` 创建 Pull Request
5. 确保 CI 通过（如已配置）
6. 请求代码评审
7. 评审通过后合并

## 代码评审标准

- 所有 PR 至少需要一位评审者
- 评审者应检查：
  - 契约一致性（shared/schemas/ 是否匹配）
  - 新功能的测试覆盖
  - 代码中是否包含密钥或凭据
  - JSON 响应是否使用 camelCase 线上格式
  - 错误处理是否得当

## 契约优先规则

这是项目中最重要的约定：

**在进行后端或前端修改之前，必须先更新** **`shared/schemas/`。**

### 原因

`shared/schemas/` 是前后端交换的所有数据结构的唯一数据源（SSOT）。如果在未更新契约的情况下修改后端或前端，双方的数据格式将会不一致。

### 工作流程

1. 阅读 `shared/schemas/entities.json` 或 `shared/schemas/ws_messages.json` 中的当前 Schema
2. 在 JSON Schema 中添加或修改字段
3. 更新后端 Pydantic 模型和 SQLAlchemy 模型
4. 按需生成数据库迁移
5. 重新生成前端类型：`pnpm codegen`
6. 更新前端组件

### 规则

- 绝对不要凭记忆编写 REST 接口或 Pydantic Schema
- 在修改 session/message/agent Schema 之前，始终先阅读 `entities.json`
- 在修改 WebSocket 消息处理之前，始终先阅读 `ws_messages.json`
- 线上字段名始终使用 camelCase（使用 `alias_generator=_to_camel`）

## 测试要求

### 运行测试

```bash
cd backend
uv run pytest

# 带覆盖率报告
uv run pytest --cov=app --cov-report=html
```

### 测试结构

```
backend/tests/
  routes/        -- API 接口测试
  websocket/     -- WebSocket 协议测试
  models/        -- 数据库模型测试
  agents/        -- Agent 适配器测试
```

### 测试范围

- 所有新增 API 接口必须有对应测试
- WebSocket 消息处理应有测试覆盖
- 边界场景：无效输入、资源缺失、权限错误
- WebSocket 操作的并发场景

## 编码规范

### 后端（Python）

- 遵循 PEP 8 代码风格
- 所有函数签名使用类型注解
- Pydantic 模型内部使用 snake\_case，通过 alias generator 转换为 camelCase
- SQLAlchemy 模型使用 snake\_case 列名
- 所有数据库操作使用 async/await（asyncpg）

### 前端（TypeScript）

- 使用 TypeScript 严格模式
- 遵循现有的组件结构
- 使用从 `shared/schemas/` 生成的类型（不要手动定义契约中已有的类型）

## AI 协作标记规范

本项目采用人机协作开发模式。为清晰记录每个 commit 的人机分工，所有 commit message 需遵循以下标记规范：

### 标记格式

在 commit message 末尾添加以下标记之一：

```
feat(backend): add JWT authentication [AI Co-authored]
fix(websocket): handle disconnect race condition [AI Guided]
chore: update dependencies [Human]
```

### 标记说明

| 标记 | 含义 | 使用场景 |
|------|------|----------|
| `[AI Co-authored]` | AI 生成主体代码，人类决策架构 | AI 根据需求生成核心实现，人类审查并调整 |
| `[AI Guided]` | AI 提供建议/审查，人类实现 | AI 发现问题或提出方案，人类编写代码 |
| `[Human]` | 纯人类操作 | 手动配置、merge、解决冲突等 |

### 示例

```
feat(backend): implement multi-agent parallel execution [AI Co-authored]
  - Topological sort for dependency graph
  - asyncio.gather for parallel agent dispatch
  
fix(backend): security hardening - sanitize error messages [AI Guided]
  - Replace raw exception messages with generic errors
  - Add MCP command whitelist

Merge pull request #20 from LeeKinyou/kinyou_dev [Human]
```

## 项目结构

```
AgentHub/
  shared/schemas/    -- 契约层（SSOT），JSON Schema 定义
  frontend/          -- Next.js 14 + Tailwind CSS 前端
  backend/           -- FastAPI + SQLAlchemy 异步后端
    app/
      models/        -- SQLAlchemy ORM 模型
      schemas/       -- Pydantic 请求/响应 Schema
      routes/        -- API 路由处理器
      core/          -- 配置、数据库、认证、工具函数
      agents/        -- Agent 适配器和编排器
    alembic/         -- 数据库迁移
    tests/           -- 测试套件
```
