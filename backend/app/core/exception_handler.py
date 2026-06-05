import traceback
from datetime import datetime, timezone

from fastapi import WebSocket

# Try to import LLM SDK exceptions for classification
try:
    import anthropic
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False

try:
    import openai
    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False

try:
    import httpx
    _HTTPX_AVAILABLE = True
except ImportError:
    _HTTPX_AVAILABLE = False

SAFE_ERROR_MESSAGES: dict[str, str] = {
    "TIMEOUT": "请求超时，请稍后重试",
    "CONNECTION_ERROR": "网络连接异常，请检查网络",
    "AUTH_ERROR": "认证失败，请重新登录",
    "PERMISSION_ERROR": "没有权限执行此操作",
    "VALIDATION_ERROR": "请求参数不合法",
    "RATE_LIMITED": "请求过于频繁，请稍后重试",
    "UNKNOWN_ERROR": "服务内部错误，请稍后重试",
}


def safe_error_message(error_code: str, exception: Exception) -> str:
    """Return a safe error message that does not leak internal details."""
    return SAFE_ERROR_MESSAGES.get(error_code, SAFE_ERROR_MESSAGES["UNKNOWN_ERROR"])


class GlobalExceptionHandler:
    """Global exception handler for WebSocket connections.

    Catches all async operation and LLM call exceptions,
    wraps them into Error cards conforming to ws_messages.json,
    and pushes them to the frontend via the current WS channel.
    """

    @staticmethod
    async def handle_exception(
        websocket: WebSocket,
        session_id: str,
        exception: Exception,
    ) -> None:
        error_code = GlobalExceptionHandler._classify_error(exception)
        recoverable = GlobalExceptionHandler._is_recoverable(exception)

        error_card = {
            "type": "error",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "sessionId": session_id,
                "errorCode": error_code,
                "errorMessage": safe_error_message(error_code, exception),
                "recoverable": recoverable,
            },
        }

        await websocket.send_json(error_card)

    @staticmethod
    def _classify_error(exception: Exception) -> str:
        # Standard library exceptions
        if isinstance(exception, TimeoutError):
            return "TIMEOUT"
        if isinstance(exception, ConnectionError):
            return "CONNECTION_ERROR"

        # httpx exceptions
        if _HTTPX_AVAILABLE:
            if isinstance(exception, httpx.TimeoutException):
                return "TIMEOUT"
            if isinstance(exception, httpx.ConnectError):
                return "CONNECTION_ERROR"

        # Anthropic SDK exceptions
        if _ANTHROPIC_AVAILABLE:
            if isinstance(exception, anthropic.APITimeoutError):
                return "TIMEOUT"
            if isinstance(exception, anthropic.AuthenticationError):
                return "AUTH_ERROR"
            if isinstance(exception, anthropic.RateLimitError):
                return "RATE_LIMITED"
            if isinstance(exception, anthropic.APIConnectionError):
                return "CONNECTION_ERROR"

        # OpenAI SDK exceptions
        if _OPENAI_AVAILABLE:
            if isinstance(exception, openai.APITimeoutError):
                return "TIMEOUT"
            if isinstance(exception, openai.AuthenticationError):
                return "AUTH_ERROR"
            if isinstance(exception, openai.RateLimitError):
                return "RATE_LIMITED"
            if isinstance(exception, openai.APIConnectionError):
                return "CONNECTION_ERROR"

        return "UNKNOWN_ERROR"

    @staticmethod
    def _is_recoverable(exception: Exception) -> bool:
        # Standard library
        if isinstance(exception, (TimeoutError, ConnectionError)):
            return True

        # httpx
        if _HTTPX_AVAILABLE and isinstance(exception, (httpx.TimeoutException, httpx.ConnectError)):
            return True

        # Anthropic SDK
        if _ANTHROPIC_AVAILABLE and isinstance(exception, (
            anthropic.APITimeoutError,
            anthropic.APIConnectionError,
        )):
            return True

        # OpenAI SDK
        if _OPENAI_AVAILABLE and isinstance(exception, (
            openai.APITimeoutError,
            openai.APIConnectionError,
        )):
            return True

        return False
