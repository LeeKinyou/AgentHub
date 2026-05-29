from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.database import get_db
from ..models.agent_profile import AgentProfile
from ..schemas.agent import AgentProfileCreate, AgentProfileRead, AgentProfileUpdate
from ..schemas.common import ApiResponse

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=ApiResponse[list[AgentProfileRead]])
async def list_agents(
    user_id: UUID | None = Query(None, description="Filter by user_id, returns system + user agents"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(AgentProfile)
    if user_id:
        # Return system agents (user_id is null) + user's own agents
        stmt = stmt.where(or_(AgentProfile.user_id.is_(None), AgentProfile.user_id == user_id))
    stmt = stmt.order_by(AgentProfile.created_at.desc())
    result = await db.execute(stmt)
    agents = result.scalars().all()
    return ApiResponse(data=[AgentProfileRead.model_validate(a) for a in agents])


@router.get("/{agent_id}", response_model=ApiResponse[AgentProfileRead])
async def get_agent(agent_id: UUID, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AgentProfile, agent_id)
    if not agent:
        return ApiResponse(code=404, message="Agent not found")
    return ApiResponse(data=AgentProfileRead.model_validate(agent))


@router.post("", response_model=ApiResponse[AgentProfileRead])
async def create_agent(body: AgentProfileCreate, db: AsyncSession = Depends(get_db)):
    agent = AgentProfile(
        user_id=body.user_id,
        name=body.name,
        avatar=body.avatar,
        role=body.role,
        adapter_type=body.adapter_type,
        description=body.description,
        system_prompt=body.system_prompt,
        agent_config=body.agent_config.model_dump() if body.agent_config else None,
    )
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return ApiResponse(data=AgentProfileRead.model_validate(agent))


@router.patch("/{agent_id}", response_model=ApiResponse[AgentProfileRead])
async def update_agent(agent_id: UUID, body: AgentProfileUpdate, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AgentProfile, agent_id)
    if not agent:
        return ApiResponse(code=404, message="Agent not found")
    if body.name is not None:
        agent.name = body.name
    if body.avatar is not None:
        agent.avatar = body.avatar
    if body.description is not None:
        agent.description = body.description
    if body.system_prompt is not None:
        agent.system_prompt = body.system_prompt
    if body.agent_config is not None:
        agent.agent_config = body.agent_config.model_dump()
    if body.status is not None:
        agent.status = body.status
    await db.flush()
    await db.refresh(agent)
    return ApiResponse(data=AgentProfileRead.model_validate(agent))


@router.delete("/{agent_id}", response_model=ApiResponse)
async def delete_agent(agent_id: UUID, db: AsyncSession = Depends(get_db)):
    agent = await db.get(AgentProfile, agent_id)
    if not agent:
        return ApiResponse(code=404, message="Agent not found")
    await db.delete(agent)
    return ApiResponse(message="deleted")
