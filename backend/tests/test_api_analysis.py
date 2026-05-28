"""
API接口测试 - 专注于代码逻辑验证
注意：由于SQLite不支持PostgreSQL特有类型(JSONB, ARRAY)，
此测试文件主要用于代码审查和逻辑分析。
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import uuid


class TestUserRoutesLogic:
    """用户路由逻辑测试"""

    def test_user_create_schema_validation(self):
        """测试用户创建schema验证"""
        from app.schemas.user import UserCreate

        # 正常情况
        user = UserCreate(username="test", email="test@example.com")
        assert user.username == "test"
        assert user.email == "test@example.com"

        # 最小参数
        user = UserCreate(username="minimal")
        assert user.email is None
        assert user.avatar is None

    def test_user_update_schema_validation(self):
        """测试用户更新schema验证"""
        from app.schemas.user import UserUpdate

        # 部分更新
        update = UserUpdate(username="newname")
        assert update.username == "newname"
        assert update.email is None

    def test_user_read_schema_validation(self):
        """测试用户读取schema验证"""
        from app.schemas.user import UserRead
        from datetime import datetime

        user = UserRead(
            id=uuid.uuid4(),
            username="test",
            email="test@example.com",
            created_at=datetime.now()
        )
        assert user.username == "test"


class TestSessionRoutesLogic:
    """会话路由逻辑测试"""

    def test_session_create_schema_validation(self):
        """测试会话创建schema验证"""
        from app.schemas.session import SessionCreate

        session = SessionCreate(
            title="Test Session",
            type="single",
            agent_ids=[uuid.uuid4()]
        )
        assert session.title == "Test Session"
        assert session.type == "single"
        assert len(session.agent_ids) == 1

    def test_session_create_default_title(self):
        """测试会话创建默认标题"""
        from app.schemas.session import SessionCreate

        session = SessionCreate(type="single", agent_ids=[])
        assert session.title == "新对话"

    def test_session_update_schema_validation(self):
        """测试会话更新schema验证"""
        from app.schemas.session import SessionUpdate

        update = SessionUpdate(title="New Title")
        assert update.title == "New Title"

        # 空更新
        update = SessionUpdate()
        assert update.title is None


class TestAgentRoutesLogic:
    """Agent路由逻辑测试"""

    def test_agent_config_schema_validation(self):
        """测试Agent配置schema验证"""
        from app.schemas.agent import AgentConfig

        config = AgentConfig(
            api_provider="openai",
            api_key="test-key",
            base_url="http://localhost:1234/v1",
            model="gpt-4"
        )
        assert config.api_provider == "openai"
        assert config.model == "gpt-4"

    def test_agent_config_defaults(self):
        """测试Agent配置默认值"""
        from app.schemas.agent import AgentConfig

        config = AgentConfig()
        assert config.api_provider == "anthropic"
        assert config.api_key == ""
        assert config.tools == []
        assert config.skills == []

    def test_agent_profile_create_schema(self):
        """测试Agent配置创建schema"""
        from app.schemas.agent import AgentProfileCreate, AgentConfig

        agent = AgentProfileCreate(
            name="Test Agent",
            role="expert",
            adapter_type="custom",
            agent_config=AgentConfig(api_provider="openai")
        )
        assert agent.name == "Test Agent"
        assert agent.user_id is None  # 系统agent

    def test_agent_profile_update_schema(self):
        """测试Agent配置更新schema"""
        from app.schemas.agent import AgentProfileUpdate

        update = AgentProfileUpdate(name="New Name")
        assert update.name == "New Name"
        assert update.avatar is None


class TestMessageRoutesLogic:
    """消息路由逻辑测试"""

    def test_message_read_schema_validation(self):
        """测试消息读取schema验证"""
        from app.schemas.message import MessageRead
        from datetime import datetime

        msg = MessageRead(
            id=uuid.uuid4(),
            session_id=uuid.uuid4(),
            sender_type="user",
            sender_id="user123",
            content="Hello",
            content_type="text",
            created_at=datetime.now()
        )
        assert msg.content == "Hello"
        assert msg.sender_type == "user"

    def test_message_create_schema_validation(self):
        """测试消息创建schema验证"""
        from app.schemas.message import MessageCreate

        msg = MessageCreate(content="Hello")
        assert msg.content == "Hello"
        assert msg.content_type == "text"  # 默认值

    def test_card_data_schema_validation(self):
        """测试卡片数据schema验证"""
        from app.schemas.message import CardData, CodeBlock, DiffBlock, DiffHunk

        # 代码块
        code = CodeBlock(language="python", code="print('hello')", title="Test")
        assert code.language == "python"

        # Diff块
        hunk = DiffHunk(oldStart=1, oldLines=5, newStart=1, newLines=5, content="+new line")
        diff = DiffBlock(
            filename="test.py",
            language="python",
            additions=1,
            deletions=0,
            hunks=[hunk]
        )
        assert diff.filename == "test.py"
        assert diff.status == "pending"  # 默认值


class TestApiResponseSchema:
    """ApiResponse schema测试"""

    def test_api_response_structure(self):
        """测试ApiResponse结构"""
        from app.schemas.common import ApiResponse

        # 成功响应
        response = ApiResponse(data={"key": "value"})
        assert response.code == 0
        assert response.message == "success"
        assert response.data == {"key": "value"}

        # 错误响应
        response = ApiResponse(code=404, message="Not found")
        assert response.code == 404
        assert response.data is None

    def test_api_response_generic(self):
        """测试ApiResponse泛型"""
        from app.schemas.common import ApiResponse

        response = ApiResponse[list]([1, 2, 3])
        assert response.data == [1, 2, 3]


class TestOrchestratorLogic:
    """Orchestrator逻辑测试"""

    def test_orchestrator_empty_adapter_types(self):
        """测试空adapter_types处理"""
        from app.agents.orchestrator import Orchestrator

        orchestrator = Orchestrator()

        # 这个测试需要异步运行
        import asyncio

        async def run_test():
            chunks = []
            async for chunk in orchestrator.process("session-id", "hello", []):
                chunks.append(chunk)
            return chunks

        chunks = asyncio.run(run_test())
        assert len(chunks) == 1
        assert chunks[0].content == "No agents configured for this session."
        assert chunks[0].is_final is True


class TestRegistryLogic:
    """Registry逻辑测试"""

    def test_get_adapter_valid_type(self):
        """测试获取有效adapter类型"""
        from app.agents.registry import get_adapter

        adapter = get_adapter("claude_code")
        assert adapter is not None

    def test_get_adapter_invalid_type(self):
        """测试获取无效adapter类型"""
        from app.agents.registry import get_adapter

        with pytest.raises(ValueError, match="Unknown adapter type"):
            get_adapter("invalid_type")

    def test_get_adapter_custom_with_config(self):
        """测试获取custom adapter带配置"""
        from app.agents.registry import get_adapter

        config = {
            "api_provider": "openai",
            "api_key": "test",
            "model": "gpt-4"
        }
        adapter = get_adapter("custom", agent_config=config)
        assert adapter is not None


class TestBaseAdapterLogic:
    """BaseAdapter逻辑测试"""

    def test_validate_messages_valid(self):
        """测试消息验证 - 有效消息"""
        from app.agents.base_adapter import BaseAdapter, Message

        # 创建一个具体的adapter实例
        class TestAdapter(BaseAdapter):
            async def stream_chat(self, messages, **kwargs):
                yield

        adapter = TestAdapter()
        messages = [
            Message(role="user", content="hello"),
            Message(role="assistant", content="hi"),
            Message(role="system", content="system message")
        ]
        assert adapter.validate_messages(messages) is True

    def test_validate_messages_invalid_role(self):
        """测试消息验证 - 无效角色"""
        from app.agents.base_adapter import BaseAdapter, Message

        class TestAdapter(BaseAdapter):
            async def stream_chat(self, messages, **kwargs):
                yield

        adapter = TestAdapter()
        messages = [ Message(role="invalid", content="hello") ]
        assert adapter.validate_messages(messages) is False


class TestExceptionHandlerLogic:
    """异常处理器逻辑测试"""

    def test_classify_error_timeout(self):
        """测试超时错误分类"""
        from app.core.exception_handler import GlobalExceptionHandler

        error = TimeoutError("Connection timed out")
        assert GlobalExceptionHandler._classify_error(error) == "TIMEOUT"

    def test_classify_error_connection(self):
        """测试连接错误分类"""
        from app.core.exception_handler import GlobalExceptionHandler

        error = ConnectionError("Connection failed")
        assert GlobalExceptionHandler._classify_error(error) == "CONNECTION_ERROR"

    def test_classify_error_unknown(self):
        """测试未知错误分类"""
        from app.core.exception_handler import GlobalExceptionHandler

        error = ValueError("Some error")
        assert GlobalExceptionHandler._classify_error(error) == "UNKNOWN_ERROR"

    def test_is_recoverable_timeout(self):
        """测试超时错误可恢复性"""
        from app.core.exception_handler import GlobalExceptionHandler

        error = TimeoutError("Timeout")
        assert GlobalExceptionHandler._is_recoverable(error) is True

    def test_is_recoverable_connection(self):
        """测试连接错误可恢复性"""
        from app.core.exception_handler import GlobalExceptionHandler

        error = ConnectionError("Connection failed")
        assert GlobalExceptionHandler._is_recoverable(error) is True

    def test_is_not_recoverable_other(self):
        """测试其他错误不可恢复"""
        from app.core.exception_handler import GlobalExceptionHandler

        error = ValueError("Some error")
        assert GlobalExceptionHandler._is_recoverable(error) is False
