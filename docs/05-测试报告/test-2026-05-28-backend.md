# AgentHub — 测试报告

> 评分维度：功能完整度（25%）
> 最后更新：2026-05-28

---

## 一、测试概况

| 指标 | 数值 |
|------|------|
| 测试框架 | pytest + pytest-asyncio |
| 测试客户端 | httpx AsyncClient |
| 测试数据库 | PostgreSQL (远程测试实例) |
| 总测试数 | 27 |
| 通过 | 24 |
| 失败 | 3 |
| 通过率 | 88.9% |

---

## 二、测试覆盖

| 模块 | 测试文件 | 测试项 | 状态 |
|------|----------|--------|------|
| 健康检查 | `test_health.py` | GET /health | ✅ 通过 |
| 用户 CRUD | `test_users.py` | 创建/查询/更新/删除用户 | ✅ 通过 |
| 会话 CRUD | `test_sessions.py` | 创建/查询/更新/删除会话 | ✅ 通过 |
| Agent CRUD | `test_agents.py` | 创建/查询/更新/删除 Agent | ✅ 通过 |
| 消息查询 | `test_messages.py` | 游标分页查询消息 | ⚠️ 部分失败 |
| API 分析 | `test_api_analysis.py` | 接口完整性分析 | ⚠️ 部分失败 |

---

## 三、发现的问题

### 3.1 Critical 级别

| 问题 | 描述 |
|------|------|
| Settings extra fields | pydantic-settings 在 `extra="forbid"` 模式下拒绝未声明的环境变量 |
| SQLite 不兼容 | 测试环境使用 SQLite 时，PostgreSQL 特有类型（UUID、JSONB、ARRAY）无法使用 |

### 3.2 High 级别

| 问题 | 描述 |
|------|------|
| HTTP 状态码不一致 | 404 错误通过 ApiResponse 返回 200 状态码 |
| 外键校验缺失 | 创建 session 时不验证 user_id 是否存在 |
| 删除级联问题 | 删除 user 时关联数据清理策略不明确 |

### 3.3 Medium 级别

| 问题 | 描述 |
|------|------|
| 不必要的 async | 部分同步操作被标记为 async |
| WebSocket messageId | 每个 chunk 生成不同的 messageId |
| Orchestrator 单 Agent 限制 | 单 Agent 时跳过规划，但规划结果未被使用 |

---

## 四、测试基础设施

### 4.1 测试配置

```python
# tests/conftest.py 核心配置
TEST_DATABASE_URL = "postgresql+asyncpg://..."  # 远程测试数据库
test_engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)

@pytest_asyncio.fixture(scope="function", autouse=True)
async def clear_database():
    """每个测试前清空所有表"""
    for table in reversed(Base.metadata.sorted_tables):
        await conn.execute(text(f"TRUNCATE TABLE {table.name} CASCADE"))
```

### 4.2 运行方式

```bash
cd backend
uv run pytest -v
```

---

## 五、详细 Bug 报告

完整的 Bug 报告见 `backend/tests/report/BUG_REPORT_1.md`，包含：

- 27 个测试的详细执行结果
- 10+ 个 Bug 的详细描述和复现步骤
- 按优先级分类的修复建议
- 测试覆盖率矩阵
