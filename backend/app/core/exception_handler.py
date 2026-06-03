import traceback
from datetime import datetime, timezone

from fastapi import WebSocket


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
                "errorMessage": str(exception),
                "recoverable": recoverable,
            },
        }

        await websocket.send_json(error_card)

    @staticmethod
    def _classify_error(exception: Exception) -> str:
        if isinstance(exception, TimeoutError):
            return "TIMEOUT"
        if isinstance(exception, ConnectionError):
            return "CONNECTION_ERROR"
        return "UNKNOWN_ERROR"

    @staticmethod
    def _is_recoverable(exception: Exception) -> bool:
        return isinstance(exception, (TimeoutError, ConnectionError))
