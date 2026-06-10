import asyncio
import logging
import re
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..agents.base_adapter import AgentStatusEvent, Message as AgentMessage, MessageChunk
from ..agents.orchestrator import AgentDescriptor, Orchestrator
from ..core.crypto import decrypt_field
from ..core.database import async_session
from ..core.diff_engine import apply_diff_to_file
from ..core.exception_handler import GlobalExceptionHandler, safe_error_message
from ..models.agent_profile import AgentProfile
from ..models.message import Message
from ..models.session import Session
from ..schemas.ws import (
    ActionStatusPayload,
    ActionResultPayload,
    AgentStatusPayload,
    ErrorPayload,
    MessageChunkPayload,
    MessageCompletePayload,
    S2CActionResult,
    S2CActionStatus,
    S2CAgentStatus,
    S2CError,
    S2CMessageChunk,
    S2CMessageComplete,
    S2CPong,
    validate_ws_message,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

_MENTION_RE = re.compile(r"@(\w+)")


def parse_mentioned_agents(content: str, roster: list[AgentDescriptor]) -> list[AgentDescriptor]:
    """Extract @AgentName mentions from content and return matching agents in roster order."""
    mentioned_names = set(_MENTION_RE.findall(content))
    if not mentioned_names:
        return []
    name_map = {a.name.lower(): a for a in roster}
    matched = [name_map[name.lower()] for name in mentioned_names if name.lower() in name_map]
    return matched


class WebSocketSessionGuard:
    """Per-connection concurrency control and rate limiting."""

    def __init__(self, min_interval_seconds: float = 1.0):
        self._lock = asyncio.Lock()
        self._min_interval = min_interval_seconds
        self._last_send_time: float = 0.0
        self._cancel_event = asyncio.Event()

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

    def request_cancel(self) -> None:
        """Signal that the current generation should be cancelled."""
        self._cancel_event.set()

    def is_cancelled(self) -> bool:
        """Check if cancellation has been requested."""
        return self._cancel_event.is_set()

    def reset_cancel(self) -> None:
        """Reset the cancellation flag for a new message."""
        self._cancel_event.clear()


async def build_conversation_history(
    db: AsyncSession,
    session_id: uuid.UUID,
    limit: int = 20,
    exclude_id: uuid.UUID | None = None,
) -> list[AgentMessage]:
    """Fetch recent messages for a session and map to agent Message format.

    Returns messages ordered oldest-first (ascending created_at, id).

    Args:
        exclude_id: Optional message ID to exclude (e.g. the just-persisted
            user message to avoid duplication with the orchestrator's own
            user_content append).
    """
    stmt = (
        select(Message)
        .where(Message.session_id == session_id)
    )
    if exclude_id is not None:
        stmt = stmt.where(Message.id != exclude_id)

    stmt = stmt.order_by(Message.created_at.desc(), Message.id.desc()).limit(limit)
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
    return S2CError(
        timestamp=datetime.now(timezone.utc).isoformat(),
        payload=ErrorPayload(
            session_id=session_id,
            error_code=code,
            error_message=message,
            recoverable=recoverable,
        ),
    ).model_dump(mode="json", by_alias=True)


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
    raw_mentioned = payload.get("mentionedAgents") or []
    raw_reply_to_id = payload.get("replyToId")
    reply_to_id = None
    if raw_reply_to_id:
        try:
            candidate = uuid.UUID(raw_reply_to_id)
            # Validate the referenced message exists in this session
            ref_result = await db.execute(
                select(Message.id).where(
                    Message.id == candidate,
                    Message.session_id == session_uuid,
                )
            )
            if ref_result.scalar_one_or_none() is not None:
                reply_to_id = candidate
        except (ValueError, TypeError):
            pass
    guard.record_send_time()

    async with guard.message_lock():
        response_message_id = str(uuid.uuid4())

        user_msg = Message(
            session_id=session_uuid,
            sender_type="user",
            sender_id="user",
            content=content,
            content_type="text",
            reply_to_id=reply_to_id,
        )
        db.add(user_msg)
        preview = content[:200] if content else ""
        await db.execute(
            update(Session)
            .where(Session.id == session_uuid)
            .values(updated_at=datetime.now(timezone.utc), last_active_at=datetime.now(timezone.utc), last_message_preview=preview)
        )
        await db.commit()

        full_content = ""
        primary_agent_id = effective_roster[0].agent_id if effective_roster else ""

        conversation_history = await build_conversation_history(
            db, session_uuid, limit=20, exclude_id=user_msg.id
        )

        # @mention routing: reorder roster to prioritize mentioned agents
        effective_roster = list(agent_roster)
        mentioned_by_id = [a for a in agent_roster if a.agent_id in raw_mentioned]
        mentioned_by_name = parse_mentioned_agents(content, agent_roster)
        # Merge: ID-based mentions first (from frontend context items), then name-based
        seen_ids: set[str] = set()
        prioritized: list[AgentDescriptor] = []
        for a in mentioned_by_id + mentioned_by_name:
            if a.agent_id not in seen_ids:
                prioritized.append(a)
                seen_ids.add(a.agent_id)
        if prioritized:
            remaining = [a for a in agent_roster if a.agent_id not in seen_ids]
            effective_roster = prioritized + remaining
            logger.info("Agent routing: prioritizing %s for session %s", [a.name for a in prioritized], session_id)

        # Mark participating agents as busy
        agent_uuids = [uuid.UUID(a.agent_id) for a in effective_roster if a.agent_id]
        if agent_uuids:
            await db.execute(
                update(AgentProfile)
                .where(AgentProfile.id.in_(agent_uuids))
                .values(status="busy")
            )
            await db.commit()

        try:
            guard.reset_cancel()
            async for event in orchestrator.process(session_id, content, effective_roster, conversation_history=conversation_history):
                if guard.is_cancelled():
                    logger.info("Generation cancelled for session %s", session_id)
                    await websocket.send_json(S2CMessageChunk(
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        payload=MessageChunkPayload(
                            message_id=response_message_id,
                            session_id=session_id,
                            agent_id=primary_agent_id,
                            chunk_type="text",
                            delta_content="\n\n[生成已取消]",
                            chunk_index=0,
                            is_final=True,
                        ),
                    ).model_dump(mode="json", by_alias=True))
                    break
                if isinstance(event, AgentStatusEvent):
                    # Update agent status in DB on terminal states
                    if event.status in ("completed", "failed"):
                        try:
                            agent_uuid = uuid.UUID(event.agent_id)
                            new_status = "online" if event.status == "completed" else "error"
                            await db.execute(
                                update(AgentProfile)
                                .where(AgentProfile.id == agent_uuid)
                                .values(status=new_status)
                            )
                            await db.commit()
                        except (ValueError, TypeError):
                            pass

                    await websocket.send_json(S2CAgentStatus(
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        payload=AgentStatusPayload(
                            session_id=session_id,
                            agent_id=event.agent_id,
                            status=event.status,
                            display_text=event.display_text,
                        ),
                    ).model_dump(mode="json", by_alias=True))
                elif isinstance(event, MessageChunk):
                    full_content += event.content
                    chunk_index = getattr(event, "chunk_index", 0)
                    await websocket.send_json(S2CMessageChunk(
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        payload=MessageChunkPayload(
                            message_id=response_message_id,
                            session_id=session_id,
                            agent_id=event.agent_id or primary_agent_id,
                            chunk_type=event.chunk_type,
                            delta_content=event.content,
                            chunk_index=chunk_index,
                            is_final=event.is_final,
                        ),
                    ).model_dump(mode="json", by_alias=True))
        except Exception as exc:
            # Mark agents as error on orchestrator failure
            if agent_uuids:
                await db.execute(
                    update(AgentProfile)
                    .where(AgentProfile.id.in_(agent_uuids))
                    .values(status="error")
                )
                await db.commit()
            logger.exception("Orchestrator failed for session %s: %s", session_id, exc)
            error_code = GlobalExceptionHandler._classify_error(exc)
            await websocket.send_json(_error_payload(
                session_id,
                error_code,
                safe_error_message(error_code, exc),
                recoverable=GlobalExceptionHandler._is_recoverable(exc),
            ))
            # Continue without closing the connection
            return

        agent_msg = Message(
            session_id=session_uuid,
            sender_type="agent",
            sender_id=primary_agent_id,
            content=full_content,
            content_type="text",
        )
        db.add(agent_msg)
        agent_preview = full_content[:200] if full_content else ""
        await db.execute(
            update(Session)
            .where(Session.id == session_uuid)
            .values(updated_at=datetime.now(timezone.utc), last_active_at=datetime.now(timezone.utc), last_message_preview=agent_preview)
        )
        await db.commit()
        await db.refresh(agent_msg)

        await websocket.send_json(S2CMessageComplete(
            timestamp=datetime.now(timezone.utc).isoformat(),
            payload=MessageCompletePayload(
                id=str(agent_msg.id),
                session_id=session_id,
                sender_type="agent",
                sender_id=agent_msg.sender_id,
                content=full_content,
                content_type="text",
                card_data=agent_msg.card_data,
                reply_to_id=None,
                is_pinned=False,
                created_at=agent_msg.created_at.isoformat() if agent_msg.created_at else datetime.now(timezone.utc).isoformat(),
            ),
        ).model_dump(mode="json", by_alias=True))


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

    await websocket.send_json(S2CActionStatus(
        timestamp=datetime.now(timezone.utc).isoformat(),
        payload=ActionStatusPayload(
            session_id=session_id,
            message_id=message_id_str,
            action_type="applyDiff",
            status="applying",
        ),
    ).model_dump(mode="json", by_alias=True))

    success, detail = await apply_diff_to_file(filename, hunks)

    new_status = "applied" if success else "rejected"
    card_data["diffBlock"]["status"] = new_status
    target_msg.card_data = card_data
    await db.commit()

    logger.info("applyDiff %s for message %s: %s", new_status, message_id_str, detail)

    await websocket.send_json(S2CActionResult(
        timestamp=datetime.now(timezone.utc).isoformat(),
        payload=ActionResultPayload(
            session_id=session_id,
            message_id=message_id_str,
            action_type="applyDiff",
            status=new_status,
            detail=detail,
        ),
    ).model_dump(mode="json", by_alias=True))


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
        if redis and await redis.exists(f"bl:{jti}"):
            await websocket.close(code=4003, reason="Token has been revoked")
            return

    user_id_str = payload.get("sub")

    # Convert token sub to UUID for proper comparison
    try:
        token_user_uuid = uuid.UUID(user_id_str) if user_id_str else None
    except (ValueError, TypeError):
        await websocket.close(code=4003, reason="Invalid user ID in token")
        return

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
        if token_user_uuid and session.user_id != token_user_uuid:
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
                # Decrypt api_key if present (stored encrypted by agents.py)
                if cfg.get("api_key"):
                    try:
                        cfg = {**cfg, "api_key": decrypt_field(cfg["api_key"])}
                    except Exception:
                        pass  # Key may not be encrypted (legacy or global-key agents)
                agent_roster.append(AgentDescriptor(
                    agent_id=str(agent.id),
                    name=agent.name,
                    role=agent.role,
                    adapter_type=agent.adapter_type,
                    description=agent.description,
                    system_prompt=agent.system_prompt,
                    agent_config=cfg,
                    skills=cfg.get("skills", []),
                ))

        try:
            while True:
                data = await websocket.receive_json()

                # Check message size to prevent abuse
                content = data.get("payload", {}).get("content", "")
                if len(content) > 50000:  # 50KB limit
                    await websocket.send_json(_error_payload(
                        session_id,
                        "PAYLOAD_TOO_LARGE",
                        "Message content too long (max 50KB)",
                        recoverable=True
                    ))
                    continue

                validated = validate_ws_message(data)
                if validated is None:
                    await websocket.send_json(
                        _error_payload(session_id, "INVALID_MESSAGE", f"Invalid or unknown message type: {data.get('type')!r}")
                    )
                    continue

                msg_type = data.get("type")

                if msg_type == "ping":
                    await websocket.send_json(S2CPong(timestamp=data.get("timestamp", "")).model_dump(mode="json", by_alias=True))

                elif msg_type == "stopGeneration":
                    logger.info("Stop generation requested for session %s", session_id)
                    guard.request_cancel()
                    await websocket.send_json(S2CPong(timestamp=data.get("timestamp", "")).model_dump(mode="json", by_alias=True))

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
            # Reset agent status on disconnect to prevent stuck "busy" state
            agent_uuids = [uuid.UUID(a.agent_id) for a in agent_roster if a.agent_id]
            if agent_uuids:
                try:
                    await db.execute(
                        update(AgentProfile)
                        .where(AgentProfile.id.in_(agent_uuids), AgentProfile.status.in_(["busy", "error"]))
                        .values(status="online")
                    )
                    await db.commit()
                except Exception:
                    pass
