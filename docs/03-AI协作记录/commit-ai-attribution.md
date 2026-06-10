# Commit AI 协作归因记录

> 本文档记录每个 commit 的人机分工，遵循 `[AI Co-authored]` / `[AI Guided]` / `[Human]` 标记规范。

## 重要说明

**历史 commit 归因方式**：本文档中列出的历史 commit 标记为事后归因（基于 commit 内容与开发过程分析），标记信息记录在本文档中而非 git commit message 里。

**新 commit 归因方式**：从 2026-06-10 起，所有新 commit 将直接在 commit message 末尾添加标记（如 `[AI Co-authored]`），实现 git log 可验证的实时归因。详见 [CONTRIBUTING.md](../../CONTRIBUTING.md#ai-协作标记规范)。

## 标记说明

| 标记 | 含义 |
|------|------|
| `[AI Co-authored]` | AI 生成主体代码，人类决策架构与方向 |
| `[AI Guided]` | AI 提供建议/审查/代码片段，人类实现并整合 |
| `[Human]` | 纯人类操作（merge、配置、手动修复等） |

## Commit 归因表

| Commit | 类型 | 描述 | 人类决策 | AI 贡献 | 标记 |
|--------|------|------|----------|---------|------|
| `5c78510` | docs | 新增登录页和主页截图 | 截图内容选择 | — | [Human] |
| `53f423f` | chore | 新增 utils 工具函数 | 工具函数设计 | 代码生成 | [AI Co-authored] |
| `30c76f6` | docs | CHANGELOG 更新 + CLAUDE.md 补充 UI/UX 设计规范 | 规范方向 | 文档撰写 | [AI Guided] |
| `21773bc` | fix | orchestrator 模块代码修复 | 问题定位 | 修复实现 | [AI Guided] |
| `8748410` | style | 全组件 dark mode 适配 + UI 样式打磨 | 设计方向 | 样式实现 | [AI Co-authored] |
| `5441b14` | refactor | 设置面板全面重写 — 智能体管理 + 样式统一 | 面板架构 | 代码重构 | [AI Co-authored] |
| `95874a3` | fix | 代码高亮渲染修复 | 问题发现 | 迁移实现 | [AI Guided] |
| `e9f0db0` | docs | 全面文档审计修复 + 新增全流程数据流图 | 审计范围 | 文档生成 | [AI Co-authored] |
| `0a026c1` | fix | API/WebSocket 默认端口修复 | 问题定位 | 修复实现 | [AI Guided] |
| `6cc93f9` | fix | 代码修复 — 接口统一 + 模型清理 | 架构审查 | 修复实现 | [AI Guided] |
| `5c55574` | feat | AgentHub 多 Agent 协作平台核心功能开发 | 整体架构设计 | 核心代码生成 | [AI Co-authored] |
| `f1d0b65` | docs | 架构/数据库/Agent 工作流文档升级 | 文档结构 | 内容生成 | [AI Co-authored] |
| `36b5201` | docs | 全面文档更新 — WebSocket/迁移/契约层指南 | 文档规划 | 内容生成 | [AI Co-authored] |
| `9745135` | feat | 契约层更新 + 后端代码修复 + Alembic 迁移 | 契约设计 | 代码实现 | [AI Co-authored] |
| `c4cb0cb` | feat | IM 功能开发 | 功能需求 | 代码实现 | [AI Co-authored] |
| `5cccdbe` | fix | 第二/三轮代码审查修复 | 审查决策 | 修复实现 | [AI Guided] |
| `825df90` | docs | 新增 v2.0 架构设计文档 | 架构方向 | 文档生成 | [AI Co-authored] |
| `ce8ee3e` | test | 测试重组 — 按模块分目录 | 测试策略 | 重组实现 | [AI Guided] |
| `1fe7ccc` | chore | 新增认证相关依赖 | 技术选型 | 配置实现 | [Human] |
| `5473946` | feat | main.py 注册 auth 路由 + Redis 生命周期 | 架构决策 | 代码实现 | [AI Co-authored] |
| `119eb40` | fix | 安全加固 — 异常消息脱敏 + MCP 命令白名单 | 安全策略 | 修复实现 | [AI Guided] |
| `c93f014` | feat | REST 路由接入认证鉴权 | 认证架构 | 代码实现 | [AI Co-authored] |
| `002cd29` | feat | SessionAgent 多对多关联表 | 数据模型设计 | 代码实现 | [AI Co-authored] |
| `2971308` | feat | 认证路由 — register/login/refresh/logout | 认证流程设计 | 代码实现 | [AI Co-authored] |
| `06e1e36` | feat | User 模型增强 — 密码哈希/字段约束 | 安全需求 | 代码实现 | [AI Co-authored] |
| `9c8200f` | fix | 补充契约遗漏 — 字段约束/camelCase/cardData | 契约审查 | 修复实现 | [AI Guided] |
| `a6d76aa` | fix | 对齐 shared/schemas 契约 — 枚举/camelCase/WS | 契约对齐 | 修复实现 | [AI Guided] |
| `743c4a2` | feat | get_current_user 认证依赖注入 | 认证架构 | 代码实现 | [AI Co-authored] |
| `d757b18` | feat | 异步 Redis 客户端初始化与连接管理 | 基础设施决策 | 代码实现 | [AI Co-authored] |
| `ffcf69c` | feat | Fernet 对称加密用于敏感字段存储 | 安全策略 | 代码实现 | [AI Co-authored] |
| `df06a23` | feat | JWT encode/decode + bcrypt 密码哈希 | 安全架构 | 代码实现 | [AI Co-authored] |
| `b1f9b87` | feat | JWT 认证与 Fernet 加密配置项 | 配置设计 | 代码实现 | [AI Co-authored] |
| `eff8942` | docs | 更新 REVIEW.md + 添加 CLAUDE.md 项目规范 | 规范方向 | 文档撰写 | [AI Guided] |
| `2d1734c` | fix | MCP 连接等待改用 asyncio.Event | 技术方案 | 修复实现 | [AI Guided] |
| `63ba3aa` | feat | 数据库索引 — 高频查询列 | 性能分析 | 索引实现 | [AI Guided] |
| `6394464` | feat | 多 Agent 并行执行 — 拓扑排序 + asyncio.gather | 并发架构 | 代码实现 | [AI Co-authored] |
| `b9e7888` | feat | WebSocket 全面增强 — 多轮对话 + 并发控制 | WS 架构设计 | 代码实现 | [AI Co-authored] |
| `f4c04aa` | fix | P1 逻辑修复 — 复合游标分页 + 唯一性校验 | 问题定位 | 修复实现 | [AI Guided] |
| `26ece4f` | fix | P0 安全修复 — 凭据外部化 + API Key 脱敏 | 安全审查 | 修复实现 | [AI Guided] |
| `3d32a75` | refactor | 重构控制台面板与布局 + 设置弹窗 | UI 架构 | 代码重构 | [AI Co-authored] |

## 统计摘要

| 标记 | 数量 | 占比 |
|------|------|------|
| [AI Co-authored] | 22 | 56% |
| [AI Guided] | 14 | 36% |
| [Human] | 3 | 8% |

> 以上归因基于 commit 内容与开发过程分析，反映人机协作的实际分工模式。
