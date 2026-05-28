# tests/ - 测试套件

基于 pytest + pytest-asyncio 的集成测试和单元测试。

## 测试结构

```
tests/
├── conftest.py           # 测试固件 (数据库、客户端)
├── test_health.py        # 健康检查端点
├── test_users.py         # 用户 CRUD 集成测试
├── test_sessions.py      # 会话 CRUD 集成测试
├── test_agents.py        # 智能体 CRUD 集成测试
├── test_messages.py      # 消息查询测试
├── test_api_analysis.py  # Schema/逻辑单元测试
└── report/
    └── BUG_REPORT_1.md   # 测试发现的 Bug 报告
```

## conftest.py - 测试固件

### setup_database (session 级)

启动时自动:
1. 连接 PostgreSQL
2. 创建 `agenthub_test` 测试数据库 (如不存在)
3. 创建所有 ORM 表

### clear_database (function 级)

每个测试前截断所有表数据，确保测试隔离。

### client (function 级)

创建 `httpx.AsyncClient`，使用 FastAPI ASGI transport，覆盖数据库依赖指向测试库。

### 运行方式

```bash
# 运行全部测试
pytest tests/ -v

# 运行特定文件
pytest tests/test_users.py -v

# 运行不需要数据库的单元测试
pytest tests/test_api_analysis.py -v

# 显示覆盖率
pytest tests/ --cov=app --cov-report=term-missing
```

---

## test_health.py (1 test)

| 测试 | 说明 |
|------|------|
| `test_health_endpoint` | `GET /health` 返回 `{"status": "ok"}` |

---

## test_users.py (12 tests)

用户 CRUD 完整集成测试。

| 测试 | 说明 |
|------|------|
| `test_create_user` | 创建用户 (完整字段) |
| `test_create_user_minimal` | 创建用户 (仅必填字段) |
| `test_list_users_empty` | 空列表 |
| `test_list_users_with_data` | 列表含数据 |
| `test_get_user` | 按 ID 获取 |
| `test_get_user_not_found` | 404 |
| `test_update_user` | 完整更新 |
| `test_update_user_partial` | 部分更新 |
| `test_update_user_not_found` | 更新不存在的用户 |
| `test_delete_user` | 删除 |
| `test_delete_user_not_found` | 删除不存在的用户 |
| `test_create_duplicate_username` | 重复用户名冲突 |
| `test_create_duplicate_email` | 重复邮箱冲突 |

---

## test_sessions.py (13 tests)

会话 CRUD 完整集成测试。依赖 `test_user` 固件自动创建测试用户。

| 测试 | 说明 |
|------|------|
| `test_create_session` | 创建会话 |
| `test_create_session_default_title` | 默认标题 "新对话" |
| `test_list_sessions_empty` | 空列表 |
| `test_list_sessions_with_data` | 列表含数据 |
| `test_get_session` | 按 ID 获取 |
| `test_get_session_not_found` | 404 |
| `test_get_session_wrong_user` | 跨用户访问拒绝 |
| `test_update_session` | 更新标题 |
| `test_update_session_not_found` | 更新不存在的会话 |
| `test_update_session_wrong_user` | 跨用户更新拒绝 |
| `test_delete_session` | 删除 |
| `test_delete_session_not_found` | 删除不存在的会话 |
| `test_delete_session_wrong_user` | 跨用户删除拒绝 |
| `test_create_session_with_agent_ids` | 含智能体 ID 列表 |
| `test_create_session_nonexistent_user` | 不存在的用户 (文档 Bug) |

---

## test_agents.py (17 tests)

智能体 CRUD 完整集成测试。

| 测试 | 说明 |
|------|------|
| `test_create_agent` | 创建智能体 (完整字段) |
| `test_create_system_agent` | 系统智能体 (user_id=null) |
| `test_create_agent_minimal` | 最小配置 |
| `test_list_agents_empty` | 空列表 |
| `test_list_agents_with_data` | 列表含数据 |
| `test_list_agents_filter_by_user` | 按用户过滤 (含系统智能体) |
| `test_list_agents_filter_by_user_excludes_others` | 排除其他用户的智能体 |
| `test_get_agent` | 按 ID 获取 |
| `test_get_agent_not_found` | 404 |
| `test_update_agent` | 完整更新 |
| `test_update_agent_partial` | 部分更新 |
| `test_update_agent_config` | 更新 agent_config JSONB |
| `test_update_agent_not_found` | 更新不存在的智能体 |
| `test_delete_agent` | 删除 |
| `test_delete_agent_not_found` | 删除不存在的智能体 |
| `test_create_agent_with_full_config` | 含 tools/skills/mcp_servers |
| `test_delete_agent_referenced_by_session` | 被会话引用时删除 (文档 Bug) |

---

## test_messages.py (7 tests)

消息查询游标分页测试。

| 测试 | 说明 |
|------|------|
| `test_list_messages_empty` | 空列表 |
| `test_list_messages_default_limit` | 默认 limit=50 |
| `test_list_messages_custom_limit` | 自定义 limit |
| `test_list_messages_invalid_limit` | 超范围 limit 返回 422 |
| `test_list_messages_with_cursor` | 游标分页 |
| `test_list_messages_nonexistent_session` | 不存在的会话返回空 |
| `test_list_messages_response_structure` | 响应结构验证 |
| `test_list_messages_with_invalid_cursor_format` | 无效游标格式 (文档 Bug) |

---

## test_api_analysis.py (27 tests)

不需要数据库的 Schema 和逻辑单元测试。

### TestUserRoutesLogic (3 tests)

| 测试 | 说明 |
|------|------|
| `test_user_create_schema_validation` | UserCreate 校验 |
| `test_user_update_schema_validation` | UserUpdate 校验 |
| `test_user_read_schema_validation` | UserRead 校验 |

### TestSessionRoutesLogic (2 tests)

| 测试 | 说明 |
|------|------|
| `test_session_create_schema_validation` | SessionCreate 校验 |
| `test_session_create_default_title` | 默认标题 "新对话" |

### TestAgentRoutesLogic (4 tests)

| 测试 | 说明 |
|------|------|
| `test_agent_config_schema_validation` | AgentConfig 校验 |
| `test_agent_config_defaults` | AgentConfig 默认值 |
| `test_agent_profile_create_schema` | AgentProfileCreate 校验 |
| `test_agent_profile_update_schema` | AgentProfileUpdate 校验 |

### TestMessageRoutesLogic (3 tests)

| 测试 | 说明 |
|------|------|
| `test_message_read_schema_validation` | MessageRead 校验 |
| `test_message_create_schema_validation` | MessageCreate 校验 |
| `test_card_data_schema_validation` | CardData (CodeBlock, DiffBlock) 校验 |

### TestApiResponseSchema (2 tests)

| 测试 | 说明 |
|------|------|
| `test_api_response_structure` | ApiResponse 结构 |
| `test_api_response_generic` | 泛型 ApiResponse |

### TestOrchestratorLogic (1 test)

| 测试 | 说明 |
|------|------|
| `test_orchestrator_empty_adapter_types` | 空智能体列表返回提示 |

### TestRegistryLogic (3 tests)

| 测试 | 说明 |
|------|------|
| `test_get_adapter_valid_type` | 有效适配器类型 |
| `test_get_adapter_invalid_type` | 无效类型抛异常 |
| `test_get_adapter_custom_with_config` | Custom 适配器传入 config |

### TestBaseAdapterLogic (2 tests)

| 测试 | 说明 |
|------|------|
| `test_validate_messages_valid` | 有效消息验证 |
| `test_validate_messages_invalid_role` | 无效角色拒绝 |

### TestExceptionHandlerLogic (6 tests)

| 测试 | 说明 |
|------|------|
| `test_classify_error_timeout` | TimeoutError 分类 |
| `test_classify_error_connection` | ConnectionError 分类 |
| `test_classify_error_unknown` | 其他错误分类 |
| `test_is_recoverable_timeout` | TimeoutError 可恢复 |
| `test_is_recoverable_connection` | ConnectionError 可恢复 |
| `test_is_not_recoverable_other` | 其他错误不可恢复 |

---

## 测试结果基线

```
73 passed, 8 failed
```

### 已知失败 (非回归)

8 个预置失败，记录在 `tests/report/BUG_REPORT_1.md` 中:

1. `test_create_agent` — 响应缺少 `created_at` 字段
2. `test_api_response_generic` — ApiResponse 泛型问题
3. `test_validate_messages_valid` — async 方法未 await
4. `test_validate_messages_invalid_role` — 同上
5. `test_list_messages_with_invalid_cursor_format` — 接受无效 UUID
6. `test_create_session_nonexistent_user` — 缺少 FK 校验
7. `test_create_duplicate_username` — IntegrityError 未捕获
8. `test_create_duplicate_email` — IntegrityError 未捕获
