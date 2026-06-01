# AgentHub — 测试报告

> 最后更新：2026-05-28

---

## 测试索引

| 日期 | 文件 | 测试范围 | 通过率 |
|------|------|----------|--------|
| 2026-05-28 | [后端集成测试](./test-2026-05-28-backend.md) | 全部后端 API | 88.9% |

---

## 测试基础设施

| 项目 | 说明 |
|------|------|
| 测试框架 | pytest + pytest-asyncio |
| 测试客户端 | httpx AsyncClient |
| 测试数据库 | PostgreSQL (远程测试实例) |
| 运行命令 | `cd backend && uv run pytest -v` |

## 测试覆盖模块

| 模块 | 测试文件 | 测试项 |
|------|----------|--------|
| 健康检查 | `test_health.py` | GET /health |
| 用户 CRUD | `test_users.py` | 创建/查询/更新/删除用户 |
| 会话 CRUD | `test_sessions.py` | 创建/查询/更新/删除会话 |
| Agent CRUD | `test_agents.py` | 创建/查询/更新/删除 Agent |
| 消息查询 | `test_messages.py` | 游标分页查询消息 |
| API 分析 | `test_api_analysis.py` | 接口完整性分析 |

---

## 使用说明

新增测试报告时：
1. 创建 `test-YYYY-MM-DD.md` 文件
2. 在本 README 的测试索引中添加一行
3. 保持每个测试报告自包含
