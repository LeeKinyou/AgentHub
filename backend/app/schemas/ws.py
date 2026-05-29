from pydantic import BaseModel
from uuid import UUID


class WSSendMessage(BaseModel):
    type: str = "sendMessage"
    session_id: UUID
    content: str


class WSTriggerAction(BaseModel):
    type: str = "triggerAction"
    message_id: UUID
    action_type: str  # applyDiff | retry | pin
    payload: dict | None = None


class WSAgentStatus(BaseModel):
    type: str = "agentStatus"
    session_id: UUID
    agent_id: str
    status: str  # analyzing | executing | completed | failed | online | offline | busy | error
    display_text: str


class WSMessageChunk(BaseModel):
    type: str = "messageChunk"
    message_id: str
    session_id: UUID
    agent_id: str
    chunk_type: str  # text | code_diff | web_preview | deploy_status
    delta_content: str
    chunk_index: int
    is_final: bool


class WSError(BaseModel):
    type: str = "error"
    session_id: str
    error_code: str
    error_message: str
    recoverable: bool
