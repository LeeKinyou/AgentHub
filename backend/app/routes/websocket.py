import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from ..agents.base_adapter import AgentStatusEvent, MessageChunk
from ..agents.orchestrator import AgentDescriptor, Orchestrator
from ..core.database import async_session
from ..core.diff_engine import apply_diff_to_file
from ..core.exception_handler import GlobalExceptionHandler
from ..models.agent_profile import AgentProfile
from ..models.message import Message
from ..models.session import Session

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
):
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

        orchestrator = Orchestrator()

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

                msg_type = data.get("type")

                if msg_type == "ping":
                    await websocket.send_json({"type": "pong", "timestamp": data.get("timestamp")})
                    continue

                if msg_type == "sendMessage":
                    payload = data.get("payload", {})
                    content = payload.get("content", "")

                    user_msg = Message(
                        session_id=session_uuid,
                        sender_type="user",
                        sender_id="user",
                        content=content,
                        content_type="text",
                    )
                    db.add(user_msg)
                    await db.commit()

                    full_content = ""
                    primary_agent_id = agent_roster[0].agent_id if agent_roster else ""

                    async for event in orchestrator.process(session_id, content, agent_roster):
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
                            await websocket.send_json({
                                "type": "messageChunk",
                                "timestamp": "",
                                "payload": {
                                    "messageId": str(uuid.uuid4()),
                                    "sessionId": session_id,
                                    "agentId": event.agent_id or primary_agent_id,
                                    "chunkType": event.chunk_type,
                                    "deltaContent": event.content,
                                    "chunkIndex": 0,
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
                    await db.commit()

                    await websocket.send_json({
                        "type": "messageComplete",
                        "timestamp": "",
                        "payload": {
                            "id": str(agent_msg.id),
                            "sessionId": session_id,
                            "senderType": "agent",
                            "senderId": agent_msg.sender_id,
                            "content": full_content,
                            "contentType": "text",
                            "createdAt": "",
                        },
                    })

                elif msg_type == "triggerAction":
                    payload = data.get("payload", {})
                    action_type = payload.get("actionType", "")
                    message_id_str = payload.get("messageId", "")

                    try:
                        message_uuid = uuid.UUID(message_id_str)
                    except (ValueError, TypeError):
                        await websocket.send_json({
                            "type": "error",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "payload": {
                                "sessionId": session_id,
                                "errorCode": "INVALID_REQUEST",
                                "errorMessage": f"Invalid messageId: {message_id_str!r}",
                                "recoverable": False,
                            },
                        })
                        continue

                    result = await db.execute(
                        select(Message).where(Message.id == message_uuid)
                    )
                    target_msg = result.scalar_one_or_none()

                    if not target_msg:
                        await websocket.send_json({
                            "type": "error",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "payload": {
                                "sessionId": session_id,
                                "errorCode": "NOT_FOUND",
                                "errorMessage": f"Message {message_id_str} not found",
                                "recoverable": False,
                            },
                        })
                        continue

                    if action_type != "applyDiff":
                        await websocket.send_json({
                            "type": "error",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "payload": {
                                "sessionId": session_id,
                                "errorCode": "UNSUPPORTED_ACTION",
                                "errorMessage": f"Unknown actionType: {action_type!r}",
                                "recoverable": False,
                            },
                        })
                        continue

                    card_data = target_msg.card_data or {}
                    diff_block = card_data.get("diffBlock")

                    if not diff_block:
                        await websocket.send_json({
                            "type": "error",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "payload": {
                                "sessionId": session_id,
                                "errorCode": "NO_DIFF",
                                "errorMessage": "Message has no diffBlock in card_data",
                                "recoverable": False,
                            },
                        })
                        continue

                    filename = diff_block.get("filename", "")
                    hunks = diff_block.get("hunks", [])

                    if not filename or not hunks:
                        await websocket.send_json({
                            "type": "error",
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "payload": {
                                "sessionId": session_id,
                                "errorCode": "INVALID_DIFF",
                                "errorMessage": "diffBlock missing filename or hunks",
                                "recoverable": False,
                            },
                        })
                        continue

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

                    logger.info(
                        "applyDiff %s for message %s: %s",
                        new_status,
                        message_id_str,
                        detail,
                    )

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

        except WebSocketDisconnect:
            pass
        except Exception as e:
            await GlobalExceptionHandler.handle_exception(websocket, session_id, e)
            await websocket.close()
        finally:
            await orchestrator.cleanup()
