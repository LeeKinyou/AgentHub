import os
from typing import AsyncGenerator
from urllib.parse import quote_plus

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.redis import reset_redis
from app.main import app

# 测试数据库配置 — 从环境变量读取，不再硬编码
TEST_DB_HOST = os.environ.get("TEST_DB_HOST", "localhost")
TEST_DB_PORT = int(os.environ.get("TEST_DB_PORT", "5432"))
TEST_DB_USER = os.environ.get("TEST_DB_USER", "postgres")
TEST_DB_PASSWORD = os.environ.get("TEST_DB_PASSWORD", "")
TEST_DB_NAME = os.environ.get("TEST_DB_NAME", "agenthub_test")

encoded_password = quote_plus(TEST_DB_PASSWORD)
TEST_DATABASE_URL = f"postgresql+asyncpg://{TEST_DB_USER}:{encoded_password}@{TEST_DB_HOST}:{TEST_DB_PORT}/{TEST_DB_NAME}"

from sqlalchemy.pool import NullPool

# Create test engine and session
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
test_async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

# 标记数据库是否可用
_db_available = False


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create test database and tables before tests run."""
    global _db_available
    try:
        default_url = f"postgresql+asyncpg://{TEST_DB_USER}:{encoded_password}@{TEST_DB_HOST}:{TEST_DB_PORT}/postgres"
        default_engine = create_async_engine(default_url, echo=False, isolation_level="AUTOCOMMIT")

        async with default_engine.begin() as conn:
            result = await conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                {"db_name": TEST_DB_NAME}
            )
            exists = result.scalar()
            if not exists:
                await conn.execute(text(f"CREATE DATABASE {TEST_DB_NAME}"))

        await default_engine.dispose()

        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        _db_available = True
    except Exception:
        _db_available = False

    yield

    if _db_available:
        await test_engine.dispose()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def clear_database():
    """Clear all tables before each test."""
    if not _db_available:
        return
    async with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(text(f"TRUNCATE TABLE {table.name} CASCADE"))
    # Reset Redis client to avoid stale connections across tests
    reset_redis()

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a raw database session for unit tests."""
    if not _db_available:
        pytest.skip("PostgreSQL not available")
    async with test_async_session() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with overridden database dependency."""
    if not _db_available:
        pytest.skip("PostgreSQL not available")

    async def override_get_db():
        async with test_async_session() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
