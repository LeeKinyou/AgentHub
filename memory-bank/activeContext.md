# AgentHub - 当前开发聚焦与上下文

> 最后更新：2026-05-27
> 当前阶段：Phase 0 - 准备阶段 & 契约锁死

---

## 1. 当前聚焦 (Active Focus)

- **架构底座固化**：已成功建立根目录顶级硬约束 `.traerules`，并严格执行物理作用域隔离与单源信任（SSOT）契约原则。
- **全局大脑对齐**：完成了 `project-design-doc.md`、`architecture.md`、`database-schema.md`、`agent_workflow.md`、`progress.md` 核心文档的逐一锁死。整个项目的宏观交互、全双工 WS 通信边界、PostgreSQL/Redis 存储及 LangGraph 状态机拓扑已全部具备理论可执行性。
- **技术栈锁定**：后端环境与依赖管理已明确采用 `uv`（禁止原生 `pip`/`venv`），所有依赖声明在 `backend/pyproject.toml`，通过 `uv pip compile` 生成锁文件。

---

## 2. 下一步开发计划 (Next Steps)

- **目标域**：`shared/` 共享契约层构建。
- **具体原子任务**：
  1. 在 `shared/schemas/entities.json` 中定义符合草案 7 规范的 `Message`、`Session`、`AgentProfile` 数据结构。
  2. 在 `shared/schemas/ws_messages.json` 中定义 WebSocket 双向控制报文（包括 `type: "chat"`, `type: "status"`, `type: "error"` 等）。
  3. 编写 `shared/scripts/codegen.js`（基于 `json-schema-to-typescript`），实现向前端一键导出强类型。
  4. 编写 `backend/scripts/sync_schemas.py`，实现向后端自动映射 Pydantic v2 校验模型。
  5. 切换到 `backend/` 物理域，执行 `uv init` 进行包治理与虚拟环境初始化，安装基础异步协议栈依赖（FastAPI、SQLAlchemy、LangGraph、Redis）。

---

## 3. 当前阻碍 (Blocks)

- **技术阻碍**：无。
- **环境阻碍**：无。后续开始编写代码时，必须时刻警惕并严格防御各层由于连续上下文拉长而导致的"短时记忆丧失"问题，依赖本套 Memory Bank 机制进行硬性对齐。

---

## 4. 关键技术决策记录 (ADR)

| 决策项 | 选型 | 理由 |
|--------|------|------|
| 前端框架 | Next.js 14 (App Router) | SSR + RSC 支持，适合 IM 实时交互场景 |
| 前端样式 | Tailwind CSS + Shadcn UI | 原子化设计，禁止第三方 CSS 库 |
| 后端框架 | FastAPI | 原生 async/await，WebSocket 支持成熟 |
| 状态机 | LangGraph | DAG 驱动多 Agent 编排，Python 生态 |
| 数据库 | PostgreSQL 15+ | JSONB 支持富媒体卡片，ACID 事务 |
| 缓存 | Redis 7+ | 分布式锁、WS 连接状态、流式缓冲 |
| 后端包管理 | `uv` | 高速依赖解析，禁止原生 `pip`/`venv` |
| 契约层 | JSON Schema (SSOT) | 单源信任，自动代码生成 |
