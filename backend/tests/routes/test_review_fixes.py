"""TDD tests for issues found in the 2026-06-03 code review.

Tests are written BEFORE the fixes. Each test should FAIL against the
current code and PASS after the corresponding fix is applied.
"""

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── P0 #1: WebSocket session_id vs user_id type mismatch ──────────────


class TestWebSocketOwnershipValidation:
    """WebSocket should compare UUID objects, not raw strings."""

    def test_ws_endpoint_converts_user_id_to_uuid(self):
        """The ownership check should convert user_id_str to UUID before comparing."""
        import inspect
        from app.routes import websocket
        source = inspect.getsource(websocket.websocket_endpoint)
        # Should convert user_id_str to UUID before comparison
        assert "uuid.UUID(user_id_str)" in source or "UUID(user_id_str)" in source, (
            "WebSocket endpoint should convert user_id_str to UUID for comparison"
        )


# ── P0 #2: Agent CRUD lacks ownership verification ────────────────────


class TestAgentOwnershipVerification:
    """Agent update/delete should verify the current user owns the agent."""

    def test_update_agent_checks_ownership(self):
        """update_agent should verify agent.user_id matches current_user.id."""
        import inspect
        from app.routes import agents
        source = inspect.getsource(agents.update_agent)
        assert "agent.user_id" in source and "current_user" in source, (
            "update_agent should check agent ownership"
        )

    def test_delete_agent_checks_ownership(self):
        """delete_agent should verify agent.user_id matches current_user.id."""
        import inspect
        from app.routes import agents
        source = inspect.getsource(agents.delete_agent)
        assert "agent.user_id" in source and "current_user" in source, (
            "delete_agent should check agent ownership"
        )

    def test_create_agent_ignores_body_user_id(self):
        """create_agent should use current_user.id, not body.user_id."""
        import inspect
        from app.routes import agents
        source = inspect.getsource(agents.create_agent)
        # Should NOT use body.user_id directly
        assert "body.user_id" not in source or "current_user.id" in source, (
            "create_agent should use current_user.id instead of body.user_id"
        )


# ── P1 #3: Conversation history includes current message ──────────────


class TestConversationHistoryDedup:
    """build_conversation_history should not include the just-persisted user message."""

    def test_build_conversation_history_excludes_current_message(self):
        """Should have a way to exclude the current message from history."""
        import inspect
        from app.routes.websocket import build_conversation_history
        sig = inspect.signature(build_conversation_history)
        # Should accept an exclude_id parameter or similar
        params = list(sig.parameters.keys())
        assert "exclude_id" in params or "current_msg_id" in params, (
            "build_conversation_history should accept an exclude_id parameter "
            "to avoid including the just-persisted user message"
        )


# ── P1 #4: CORS_ORIGINS env var parsing ───────────────────────────────


class TestCORSOriginsParsing:
    """CORS_ORIGINS should be parseable from env var strings."""

    def test_cors_origins_from_json_string(self):
        """Should parse JSON-formatted string into list."""
        from app.core.config import Settings
        import os
        # Simulate env var as JSON string
        with patch.dict(os.environ, {
            "CORS_ORIGINS": '["http://a.com", "http://b.com"]',
            "SECRET_KEY": "test-secret-key-long-enough-for-256",
        }):
            settings = Settings()
            assert isinstance(settings.CORS_ORIGINS, list)
            assert len(settings.CORS_ORIGINS) == 2
            assert "http://a.com" in settings.CORS_ORIGINS

    def test_cors_origins_from_comma_string(self):
        """Should parse comma-separated string into list."""
        from app.core.config import Settings
        import os
        with patch.dict(os.environ, {
            "CORS_ORIGINS": "http://a.com, http://b.com",
            "SECRET_KEY": "test-secret-key-long-enough-for-256",
        }):
            settings = Settings()
            assert isinstance(settings.CORS_ORIGINS, list)
            assert len(settings.CORS_ORIGINS) == 2


# ── P2 #6: Orchestrator planner creates new client each time ──────────


class TestOrchestratorClientReuse:
    """Orchestrator should reuse the Anthropic client for planning."""

    def test_orchestrator_caches_planner_client(self):
        """Orchestrator should have a _planner_client attribute for caching."""
        from app.agents.orchestrator import Orchestrator
        orch = Orchestrator()
        assert hasattr(orch, '_planner_client'), (
            "Orchestrator should have _planner_client attribute for caching"
        )
        assert hasattr(orch, '_planner_api_key'), (
            "Orchestrator should have _planner_api_key attribute for cache invalidation"
        )


# ── P2 #7: Codex/OpenCode adapters are stubs ──────────────────────────


class TestAdapterNotImplemented:
    """Codex and OpenCode adapters should raise NotImplementedError."""

    def test_codex_adapter_raises_not_implemented(self):
        """get_adapter('codex') should raise NotImplementedError."""
        from app.agents.registry import get_adapter
        with pytest.raises(NotImplementedError, match="not yet implemented"):
            get_adapter("codex")

    def test_opencode_adapter_raises_not_implemented(self):
        """get_adapter('opencode') should raise NotImplementedError."""
        from app.agents.registry import get_adapter
        with pytest.raises(NotImplementedError, match="not yet implemented"):
            get_adapter("opencode")


# ── P2 #8: Error classification not comprehensive ─────────────────────


class TestErrorClassification:
    """Error classification should handle LLM SDK exceptions."""

    def test_classify_anthropic_timeout(self):
        """Should classify Anthropic timeout errors as TIMEOUT."""
        from app.core.exception_handler import GlobalExceptionHandler
        try:
            import anthropic
            exc = anthropic.APITimeoutError(request=MagicMock())
            assert GlobalExceptionHandler._classify_error(exc) == "TIMEOUT"
        except ImportError:
            pytest.skip("anthropic not installed")

    def test_classify_anthropic_auth_error(self):
        """Should classify Anthropic auth errors as AUTH_ERROR."""
        from app.core.exception_handler import GlobalExceptionHandler
        try:
            import anthropic
            exc = anthropic.AuthenticationError(
                message="Invalid API key",
                response=MagicMock(status_code=401),
                body=None
            )
            assert GlobalExceptionHandler._classify_error(exc) == "AUTH_ERROR"
        except ImportError:
            pytest.skip("anthropic not installed")

    def test_classify_rate_limit_error(self):
        """Should classify rate limit errors as RATE_LIMITED."""
        from app.core.exception_handler import GlobalExceptionHandler
        try:
            import anthropic
            exc = anthropic.RateLimitError(
                message="Rate limited",
                response=MagicMock(status_code=429),
                body=None
            )
            assert GlobalExceptionHandler._classify_error(exc) == "RATE_LIMITED"
        except ImportError:
            pytest.skip("anthropic not installed")


# ── P2 #10: update_user missing uniqueness check ─────────────────────


class TestUpdateUserUniqueness:
    """update_user should catch IntegrityError on duplicate username/email."""

    def test_update_user_handles_integrity_error(self):
        """update_user should catch IntegrityError and return 409."""
        import inspect
        from app.routes import users
        source = inspect.getsource(users.update_user)
        assert "IntegrityError" in source, (
            "update_user should catch IntegrityError for duplicate username/email"
        )


# ── P2 #14: WebSocket message size not limited ────────────────────────


class TestWebSocketMessageSizeLimit:
    """WebSocket should reject messages with content > 50KB."""

    def test_ws_endpoint_checks_content_length(self):
        """websocket_endpoint should check content length."""
        import inspect
        from app.routes import websocket
        source = inspect.getsource(websocket.websocket_endpoint)
        assert "50000" in source or "50KB" in source or "PAYLOAD_TOO_LARGE" in source, (
            "WebSocket endpoint should check content length (50KB limit)"
        )


# ── P3 #5: logout import time inside function ─────────────────────────


class TestLogoutImportStyle:
    """logout should import time at module level, not inside the function."""

    def test_time_import_at_module_level(self):
        """time should be imported at the top of routes/auth.py."""
        from app.routes import auth
        import inspect
        source = inspect.getsource(auth)
        # Check that 'import time' or 'from time import' is at module level
        lines = source.split("\n")
        module_level_imports = [
            line for line in lines
            if line.startswith("import time") or line.startswith("from time import")
        ]
        assert len(module_level_imports) > 0, (
            "time should be imported at module level in routes/auth.py"
        )


# ── P3 #11: SessionUpdate.title has no length constraint ──────────────


class TestSessionUpdateTitleConstraint:
    """SessionUpdate.title should have max_length constraint."""

    def test_session_update_title_max_length(self):
        """SessionUpdate.title should have max_length=255."""
        from app.schemas.session import SessionUpdate
        import inspect
        source = inspect.getsource(SessionUpdate)
        assert "max_length=255" in source, (
            "SessionUpdate.title should have max_length=255 constraint"
        )


# ── P3 #16: Missing Redis mock ────────────────────────────────────────


class TestRedisAvailabilityCheck:
    """Tests should have Redis availability check."""

    def test_redis_available_fixture_exists(self):
        """conftest.py should have redis_available fixture."""
        from tests import conftest
        assert hasattr(conftest, '_redis_available'), (
            "conftest.py should have _redis_available flag"
        )
