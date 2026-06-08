# Alembic 数据库迁移指南

使用 Alembic 管理 AgentHub 后端数据库 Schema 迁移的操作指南。

## 前置条件

Alembic 已在 `pyproject.toml` 中声明为依赖：

```toml
dependencies = [
    # ...
    "alembic>=1.14.0",
]
```

通过 uv 安装：

```bash
cd backend
uv sync
```

## 配置

### alembic.ini

位于 `backend/alembic.ini`。`sqlalchemy.url` 占位符在运行时由 `env.py` 覆盖。

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
```

### alembic/env.py

位于 `backend/alembic/env.py`。主要特性：

- **异步 SQLAlchemy 支持**：使用 `asyncpg` 驱动配合 `async_engine_from_config`
- **动态 URL**：从 `app.core.config.get_settings()` 读取 `DATABASE_URL`
- **模型自动发现**：导入所有模型模块，使 Alembic 能检测表结构变更

```python
from app.core.config import get_settings
from app.core.database import Base
from app.models import user, session, message, agent_profile, session_agent  # noqa: F401

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
```

## 常用操作

### 生成迁移文件

修改 SQLAlchemy 模型后，生成新的迁移文件：

```bash
cd backend
uv run alembic revision --autogenerate -m "description of changes"
```

该命令会在 `backend/alembic/versions/` 下创建一个新文件，包含自动检测到的 Schema 变更。

### 执行迁移

应用所有待执行的迁移以更新到最新 Schema：

```bash
cd backend
uv run alembic upgrade head
```

### 回滚

回滚上一次迁移：

```bash
cd backend
uv run alembic downgrade -1
```

回滚到指定版本：

```bash
cd backend
uv run alembic upgrade <revision_id>
```

### 查看迁移历史

```bash
cd backend
uv run alembic history
```

### 查看当前版本

```bash
cd backend
uv run alembic current
```

## 最佳实践

1. **务必检查自动生成的迁移** -- Alembic 的自动检测并不完美，可能会遗漏：
   - 数据库端默认值（例如 `server_default=func.now()`）
   - 自定义类型变更
   - 约束重命名
   - 枚举值新增

2. **先在开发环境测试，再上线生产环境** -- 先在开发数据库上运行迁移

3. **使用描述性的提交信息** -- `--autogenerate -m "add reply_to_id to messages"` 优于 `--autogenerate -m "update"`

4. **每次迁移只包含一个逻辑变更** -- 不要将不相关的 Schema 变更打包在一起

5. **不要编辑已执行的迁移** -- 如果某个迁移已在任何环境中执行过，请创建新的迁移来修复问题

6. **检查生成的 SQL** -- 在执行前审查 `upgrade()` 和 `downgrade()` 函数

## 当前状态

初始迁移**尚未生成**。创建方法：

```bash
cd backend
uv run alembic revision --autogenerate -m "init"
```

该命令会检测所有现有表（users、sessions、messages、agent_profiles、session_agents）并生成基线迁移。

## 模型到迁移的工作流程

1. 在 `backend/app/models/` 中修改 SQLAlchemy 模型
2. 按需更新 `backend/app/schemas/` 中对应的 Pydantic Schema
3. 生成迁移文件：`uv run alembic revision --autogenerate -m "description"`
4. 检查生成的迁移文件
5. 执行迁移：`uv run alembic upgrade head`
6. 运行测试验证：`uv run pytest`
