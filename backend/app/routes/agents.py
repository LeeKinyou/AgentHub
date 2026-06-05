from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.crypto import encrypt_field
from ..core.database import get_db
from ..dependencies import get_current_user
from ..models.agent_profile import AgentProfile
from ..models.user import User
from ..schemas.agent import AgentProfileCreate, AgentProfileRead, AgentProfileUpdate
from ..schemas.common import ApiResponse

router = APIRouter(prefix="/agents", tags=["agents"])


def _encrypt_config_api_key(config: dict | None) -> dict | None:
    """Encrypt api_key in agent_config before DB storage."""
    if not config:
        return config
    key = config.get("api_key")
    if key:
        config = {**config, "api_key": encrypt_field(key)}
    return config


@router.get("", response_model=ApiResponse[list[AgentProfileRead]])
async def list_agents(
    user_id: UUID | None = Query(None, description="Filter by user_id, returns system + user agents"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AgentProfile)
    if user_id:
        # Only allow viewing system agents + own agents
        if user_id != current_user.id:
            # Other user's id — only return system agents
            stmt = stmt.where(AgentProfile.user_id.is_(None))
        else:
            stmt = stmt.where(or_(AgentProfile.user_id.is_(None), AgentProfile.user_id == user_id))
    stmt = stmt.order_by(AgentProfile.created_at.desc())
    result = await db.execute(stmt)
    agents = result.scalars().all()
    return ApiResponse(data=[AgentProfileRead.model_validate(a) for a in agents])


@router.get("/{agent_id}", response_model=ApiResponse[AgentProfileRead])
async def get_agent(
    agent_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await db.get(AgentProfile, agent_id)
    if not agent:
        return ApiResponse(code=404, message="Agent not found")
    return ApiResponse(data=AgentProfileRead.model_validate(agent))


@router.post("", response_model=ApiResponse[AgentProfileRead])
async def create_agent(
    body: AgentProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    config_dict = body.agent_config.model_dump() if body.agent_config else None
    # Use current_user.id — ignore body.user_id to prevent creating agents under other users
    agent = AgentProfile(
        user_id=current_user.id,
        name=body.name,
        avatar=body.avatar,
        role=body.role,
        adapter_type=body.adapter_type,
        description=body.description,
        system_prompt=body.system_prompt,
        agent_config=_encrypt_config_api_key(config_dict),
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return ApiResponse(data=AgentProfileRead.model_validate(agent))


@router.patch("/{agent_id}", response_model=ApiResponse[AgentProfileRead])
async def update_agent(
    agent_id: UUID,
    body: AgentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await db.get(AgentProfile, agent_id)
    if not agent:
        return ApiResponse(code=404, message="Agent not found")
    # Ownership check: only the owner can modify (system agents with user_id=None are protected)
    if agent.user_id and agent.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if body.name is not None:
        agent.name = body.name
    if body.avatar is not None:
        agent.avatar = body.avatar
    if body.description is not None:
        agent.description = body.description
    if body.system_prompt is not None:
        agent.system_prompt = body.system_prompt
    if body.agent_config is not None:
        agent.agent_config = _encrypt_config_api_key(body.agent_config.model_dump())
    if body.status is not None:
        agent.status = body.status
    await db.flush()
    await db.refresh(agent)
    return ApiResponse(data=AgentProfileRead.model_validate(agent))


@router.delete("/{agent_id}", response_model=ApiResponse)
async def delete_agent(
    agent_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    agent = await db.get(AgentProfile, agent_id)
    if not agent:
        return ApiResponse(code=404, message="Agent not found")
    # Ownership check: only the owner can delete
    if agent.user_id and agent.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(agent)
    return ApiResponse(message="deleted")
