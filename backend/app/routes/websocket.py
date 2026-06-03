import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..agents.base_adapter import AgentStatusEvent, Message as AgentMessage, MessageChunk
from ..agents.orchestrator import AgentDescriptor, Orchestrator
from ..core.database import async_session
from ..core.diff_engine import apply_diff_to_file
from ..core.exception_handler import GlobalExceptionHandler
from ..models.agent_profile import AgentProfile
from ..models.message import Message
from ..models.session import Session
from ..schemas.ws import validate_ws_message

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


class WebSocketSessionGuard:
    """Per-connection concurrency control and rate limiting."""

    def __init__(self, min_interval_seconds: float = 1.0):
        self._lock = asyncio.Lock()
        self._min_interval = min_interval_seconds
        self._last_send_time: float = 0.0

    @asynccontextmanager
    async def message_lock(self):
        async with self._lock:
            yield

    def message_lock_locked(self) -> bool:
        return self._lock.locked()

    def can_accept_message(self) -> bool:
        return not self._lock.locked()

    def check_rate_limit(self) -> bool:
        if self._last_send_time == 0.0:
            return True
        return (time.monotonic() - self._last_send_time) >= self._min_interval

    def record_send_time(self) -> None:
        self._last_send_time = time.monotonic()


async def build_conversation_history(
    db: AsyncSession,
    session_id: uuid.UUID,
    limit: int = 20,
) -> list[AgentMessage]:
    """Fetch recent messages for a session and map to agent Message format.

    Returns messages ordered oldest-first (ascending created_at, id).
    """
    stmt = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    # DB returns DESC order; reverse to get oldest-first
    return [
        AgentMessage(
            role="user" if m.sender_type == "user" else "assistant",
            content=m.content,
        )
        for m in reversed(rows)
    ]


def _error_payload(session_id: str, code: str, message: str, recoverable: bool = False) -> dict:
    return {
        "type": "error",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "sessionId": session_id,
            "errorCode": code,
            "errorMessage": message,
            "recoverable": recoverable,
        },
    }


async def _handle_send_message(
    *,
    db: AsyncSession,
    websocket: WebSocket,
    session_id: str,
    session_uuid: uuid.UUID,
    payload: dict,
    guard: WebSocketSessionGuard,
    orchestrator: Orchestrator,
    agent_roster: list[AgentDescriptor],
) -> None:
    """Handle a sendMessage: rate-limit check, persist, stream response."""
    if not guard.check_rate_limit():
        await websocket.send_json(_error_payload(session_id, "RATE_LIMITED", "Too many messages, please slow down", True))
        return

    if not guard.can_accept_message():
        await websocket.send_json(_error_payload(session_id, "BUSY", "Previous message is still being processed", True))
        return

    content = payload.get("content", "")
    guard.record_send_time()

    async with guard.message_lock():
        response_message_id = str(uuid.uuid4())

        user_msg = Message(
            session_id=session_uuid,
            sender_type="user",
            sender_id="user",
            content=content,
            content_type="text",
        )
        db.add(user_msg)
        await db.execute(
            update(Session)
            .where(Session.id == session_uuid)
            .values(updated_at=datetime.now(timezone.utc))
        )
        await db.commit()

        full_content = ""
        primary_agent_id = agent_roster[0].agent_id if agent_roster else ""

        conversation_history = await build_conversation_history(db, session_uuid, limit=20)

        async for event in orchestrator.process(session_id, content, agent_roster, conversation_history=conversation_history):
            if isinstance(event, AgentStatusEvent):
                await websocket.send_json({
                    "type": "agentStatus",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "payload": {
                        "sessionId": session_id,
                        "agentId": event.agent_id,
                        "status": event.status,
                        "displayText": event.display_text,
                    },
                })
            elif isinstance(event, MessageChunk):
                full_content += event.content
                chunk_index = getattr(event, "chunk_index", 0)
                await websocket.send_json({
                    "type": "messageChunk",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "payload": {
                        "messageId": response_message_id,
                        "sessionId": session_id,
                        "agentId": event.agent_id or primary_agent_id,
                        "chunkType": event.chunk_type,
                        "deltaContent": event.content,
                        "chunkIndex": chunk_index,
                        "isFinal": event.is_final,
                    },
                })

    agent_msg = Message(
        session_id=session_uuid,
        sender_type="agent",
        sender_id=primary_agent_id,
        content=full_content,
        content_type="text",
    )
    db.add(agent_msg)
    await db.execute(
        update(Session)
        .where(Session.id == session_uuid)
        .values(updated_at=datetime.now(timezone.utc))
    )
    await db.commit()
    await db.refresh(agent_msg)

    await websocket.send_json({
        "type": "messageComplete",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "id": str(agent_msg.id),
            "sessionId": session_id,
            "senderType": "agent",
            "senderId": agent_msg.sender_id,
            "content": full_content,
            "contentType": "text",
            "cardData": agent_msg.card_data,
            "createdAt": agent_msg.created_at.isoformat() if agent_msg.created_at else datetime.now(timezone.utc).isoformat(),
        },
    })


async def _handle_trigger_action(
    *,
    db: AsyncSession,
    websocket: WebSocket,
    session_id: str,
    session_uuid: uuid.UUID,
    payload: dict,
) -> None:
    """Handle a triggerAction: validate, apply diff, report result."""
    action_type = payload.get("actionType", "")
    message_id_str = payload.get("messageId", "")

    try:
        message_uuid = uuid.UUID(message_id_str)
    except (ValueError, TypeError):
        await websocket.send_json(_error_payload(session_id, "INVALID_REQUEST", f"Invalid messageId: {message_id_str!r}"))
        return

    result = await db.execute(
        select(Message).where(
            Message.id == message_uuid,
            Message.session_id == session_uuid,
        )
    )
    target_msg = result.scalar_one_or_none()

    if not target_msg:
        await websocket.send_json(_error_payload(session_id, "NOT_FOUND", f"Message {message_id_str} not found"))
        return

    if action_type != "applyDiff":
        await websocket.send_json(_error_payload(session_id, "UNSUPPORTED_ACTION", f"Unknown actionType: {action_type!r}"))
        return

    card_data = target_msg.card_data or {}
    diff_block = card_data.get("diffBlock")

    if not diff_block:
        await websocket.send_json(_error_payload(session_id, "NO_DIFF", "Message has no diffBlock in card_data"))
        return

    filename = diff_block.get("filename", "")
    hunks = diff_block.get("hunks", [])

    if not filename or not hunks:
        await websocket.send_json(_error_payload(session_id, "INVALID_DIFF", "diffBlock missing filename or hunks"))
        return

    await websocket.send_json({
        "type": "actionStatus",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "sessionId": session_id,
            "messageId": message_id_str,
            "actionType": "applyDiff",
            "status": "applying",
        },
    })

    success, detail = await apply_diff_to_file(filename, hunks)

    new_status = "applied" if success else "rejected"
    card_data["diffBlock"]["status"] = new_status
    target_msg.card_data = card_data
    await db.commit()

    logger.info("applyDiff %s for message %s: %s", new_status, message_id_str, detail)

    await websocket.send_json({
        "type": "actionResult",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": {
            "sessionId": session_id,
            "messageId": message_id_str,
            "actionType": "applyDiff",
            "status": new_status,
            "detail": detail,
        },
    })


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str | None = None,
):
    # Authenticate before accepting
    if not token:
        await websocket.close(code=4003, reason="Token required")
        return

    from ..core.auth import decode_access_token
    from ..core.redis import get_redis_client
    try:
        payload = decode_access_token(token)
    except Exception:
        await websocket.close(code=4003, reason="Invalid or expired token")
        return

    # Check blacklist
    jti = payload.get("jti")
    if jti:
        redis = await get_redis_client()
        if await redis.exists(f"bl:{jti}"):
            await websocket.close(code=4003, reason="Token has been revoked")
            return

    user_id_str = payload.get("sub")

    await websocket.accept()

    async with async_session() as db:
        try:
            session_uuid = uuid.UUID(session_id)
        except ValueError:
            await GlobalExceptionHandler.handle_exception(
                websocket, session_id, ValueError("Invalid session_id format")
            )
            await websocket.close()
            return

        session = await db.get(Session, session_uuid)
        if not session:
            await GlobalExceptionHandler.handle_exception(
                websocket, session_id, ValueError("Session not found")
            )
            await websocket.close()
            return

        # Verify session ownership
        if user_id_str and str(session.user_id) != user_id_str:
            await websocket.close(code=4003, reason="Session does not belong to this user")
            return

        orchestrator = Orchestrator()
        guard = WebSocketSessionGuard()

        agent_roster: list[AgentDescriptor] = []
        if session.agent_ids:
            result = await db.execute(
                select(AgentProfile).where(AgentProfile.id.in_(session.agent_ids))
            )
            for agent in result.scalars().all():
                cfg = agent.agent_config or {}
                agent_roster.append(AgentDescriptor(
                    agent_id=str(agent.id),
                    name=agent.name,
                    role=agent.role,
                    adapter_type=agent.adapter_type,
                    description=agent.description,
                    system_prompt=agent.system_prompt,
                    agent_config=agent.agent_config,
                    skills=cfg.get("skills", []),
                ))

        try:
            while True:
                data = await websocket.receive_json()

                validated = validate_ws_message(data)
                if validated is None:
                    await websocket.send_json(
                        _error_payload(session_id, "INVALID_MESSAGE", f"Invalid or unknown message type: {data.get('type')!r}")
                    )
                    continue

                msg_type = data.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": data.get("timestamp")})

                elif msg_type == "sendMessage":
                    await _handle_send_message(
                        db=db,
                        websocket=websocket,
                        session_id=session_id,
                        session_uuid=session_uuid,
                        payload=data.get("payload", {}),
                        guard=guard,
                        orchestrator=orchestrator,
                        agent_roster=agent_roster,
                    )

                elif msg_type == "triggerAction":
                    await _handle_trigger_action(
                        db=db,
                        websocket=websocket,
                        session_id=session_id,
                        session_uuid=session_uuid,
                        payload=data.get("payload", {}),
                    )

        except WebSocketDisconnect:
            pass
        except Exception as e:
            await GlobalExceptionHandler.handle_exception(websocket, session_id, e)
            await websocket.close()
        finally:
            await orchestrator.cleanup()
