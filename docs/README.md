# AgentHub — 项目交付文档

> 本文档目录为课题答辩交付物入口，按评分维度组织。

---

## 文档索引

| 序号 | 文档 | 说明 |
|------|------|------|
| 00 | [课题要求](./00-课题要求/) | 课程课题要求、评分标准、前期准备 |
| 01 | [产品设计文档 (PRD)](./01-PRD/) | **按版本管理**，重大变更新增版本文件 |
| 02 | [技术架构设计](./02-架构设计/) | **按版本管理**，重大变更新增版本文件 |
| 03 | [AI 协作开发记录](./03-AI协作记录/) | **按阶段拆分**，每个阶段独立文件 |
| 04 | [代码审查记录](./04-代码审查/) | **按日期拆分**，每次审查独立文件 |
| 05 | [测试报告](./05-测试报告/) | **按日期拆分**，每次测试独立文件 |
| 06 | [前端文档](./06-Frontend/) | 前端组件树、状态管理、WebSocket 流 |

## 附录

| 文档 | 说明 |
|------|------|
| [提示词模板库](./appendix/prompts-gallery.md) | 开发过程中使用的 AI Prompt 集合 |
| [AI 行为准则](./appendix/rules-reference.md) | `.agentrules` 全文 |

---

## 文档管理规则

### 文件命名规范

```
01-PRD/v{X}.md                        例：v1.0.md, v2.0.md
02-架构设计/v{X}.md                    例：v1.0.md, v2.0.md
03-AI协作记录/phase{N}-{功能名}.md      例：phase3-群聊编排.md
04-代码审查/review-{YYYY-MM-DD}-{scope}.md  例：review-2026-06-01-frontend.md
05-测试报告/test-{YYYY-MM-DD}-{scope}.md    例：test-2026-06-01-frontend.md
```

### 新增内容时的操作

| 文档类型 | 操作 |
|----------|------|
| PRD 重大变更 | 在 `01-PRD/` 下新建 `v{X}.md`，更新其 README 索引 |
| 架构重大变更 | 在 `02-架构设计/` 下新建 `v{X}.md`，更新其 README 索引 |
| 新功能开发 | 在 `03-AI协作记录/` 下新建 `phase{N}-{功能名}.md`，更新其 README 索引 |
| 代码审查 | 在 `04-代码审查/` 下新建 `review-{日期}-{scope}.md`，更新其 README 索引 |
| 测试报告 | 在 `05-测试报告/` 下新建 `test-{日期}-{scope}.md`，更新其 README 索引 |

**核心原则**：已有文件不改动，只新增文件 + 更新索引。

---

## 关联文档（开发过程）

以下文档位于 `memory-bank/` 目录，记录了项目开发过程中的实时状态：

- `memory-bank/project-design-doc.md` — 产品宏观设计
- `memory-bank/architecture.md` — 系统架构与通信规范
- `memory-bank/database-schema.md` — 数据库设计
- `memory-bank/agent_workflow.md` — Agent 状态机设计
- `memory-bank/progress.md` — 项目进度看板
- `memory-bank/activeContext.md` — 当前开发聚焦
- `memory-bank/prompts.md` — 提示词模板库
