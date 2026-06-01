# Phase 0：准备阶段 — AI 撰写设计文档

> 时间：2026-05-27
> 状态：✅ 已完成

---

## 目标

在写代码之前，让 AI 协助完成所有设计文档，锁死架构决策。

## 人机分工

| 任务 | 人类 | AI |
|------|------|-----|
| 产品定位与核心价值 | 确定方向 | 撰写 `project-design-doc.md` |
| 系统架构设计 | 确定技术选型 | 撰写 `architecture.md`，绘制 Mermaid 架构图 |
| 数据库设计 | 确定存储策略 | 撰写 `database-schema.md`，生成 DDL |
| Agent 状态机设计 | 确定协作模式 | 撰写 `agent_workflow.md`，绘制状态流转图 |
| JSON Schema 契约 | 审核字段设计 | 编写 `entities.json` 和 `ws_messages.json` |
| 代码生成工具链 | 确定工具选型 | 编写 `codegen.js` 脚本 |

## 协作亮点

- AI 根据产品需求文档自动生成了完整的 WebSocket 协议规范（8 种消息类型），包括客户端→服务端和服务端→客户端的双向报文定义
- AI 设计了 LangGraph 状态机的完整节点拓扑，包括 Intent_Router、Task_Decomposer、Agent_Selector 等节点的详细实现
- 所有设计文档经过多轮迭代，AI 根据人类反馈持续优化

## 典型 Prompt

```
人类：请根据以下需求设计 WebSocket 双向通信协议：
- 客户端可以发送：ping、用户消息、触发 action（如 applyDiff）
- 服务端可以推送：pong、Agent 状态、消息 chunk、完整消息、错误
- 所有消息必须有 type + timestamp + payload 结构
- 请输出 JSON Schema Draft-07 格式

AI：（生成 ws_messages.json，包含 8 种消息类型的完整定义）
```

## 交付物

| 文件 | 说明 |
|------|------|
| `memory-bank/project-design-doc.md` | 产品宏观设计文档 |
| `memory-bank/architecture.md` | 系统架构与通信规范 |
| `memory-bank/database-schema.md` | 数据库设计文档 |
| `memory-bank/agent_workflow.md` | Agent 状态机设计 |
| `memory-bank/progress.md` | 项目进度看板 |
| `memory-bank/activeContext.md` | 当前开发聚焦 |
| `memory-bank/prompts.md` | 提示词模板库 |
| `shared/schemas/entities.json` | 核心实体契约 |
| `shared/schemas/ws_messages.json` | WebSocket 报文契约 |
| `shared/scripts/codegen.js` | TypeScript 类型生成脚本 |

**合计**：7 份设计文档 + 2 个 JSON Schema + 1 个代码生成脚本
