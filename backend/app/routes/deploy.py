import time
import uuid
from enum import Enum

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..schemas.common import ApiResponse

router = APIRouter(prefix="/api/deploy", tags=["deploy"])


class DeployType(str, Enum):
    static = "static"
    container = "container"


class DeployStatus(str, Enum):
    building = "building"
    deploying = "deploying"
    success = "success"
    failed = "failed"


# In-memory storage for demo purposes
_deployments: dict[str, dict] = {}

# Status progression timing (seconds elapsed -> status)
_STATUS_TIMELINE: list[tuple[float, str]] = [
    (0, "building"),
    (10, "deploying"),
    (20, "success"),
]


class DeployCreate(BaseModel):
    session_id: str
    project_name: str
    source_code: str
    deploy_type: DeployType


class DeployRecord(BaseModel):
    deploy_id: str
    session_id: str
    project_name: str
    deploy_type: DeployType
    status: str
    url: str | None
    created_at: float


def _generate_short_id() -> str:
    return uuid.uuid4().hex[:8]


def _advance_status(record: dict) -> str:
    """Determine current status based on elapsed time since creation."""
    elapsed = time.time() - record["created_at"]
    current_status = record["status"]
    for threshold, status in _STATUS_TIMELINE:
        if elapsed >= threshold:
            current_status = status
    return current_status


@router.post("", response_model=ApiResponse[DeployRecord])
async def start_deployment(body: DeployCreate):
    deploy_id = str(uuid.uuid4())
    now = time.time()
    record: dict = {
        "deploy_id": deploy_id,
        "session_id": body.session_id,
        "project_name": body.project_name,
        "deploy_type": body.deploy_type,
        "status": "building",
        "url": None,
        "created_at": now,
    }
    _deployments[deploy_id] = record
    return ApiResponse(data=DeployRecord(**record), message="部署任务已创建")


@router.get("", response_model=ApiResponse[list[DeployRecord]])
async def list_deployments(session_id: str | None = Query(None)):
    results: list[DeployRecord] = []
    for record in _deployments.values():
        if session_id and record["session_id"] != session_id:
            continue
        record["status"] = _advance_status(record)
        if record["status"] == "success" and not record["url"]:
            short_id = record["deploy_id"][:8]
            record["url"] = f"https://agenthub-deploy-{short_id}.vercel.app"
        results.append(DeployRecord(**record))
    return ApiResponse(data=results)


@router.get("/{deploy_id}", response_model=ApiResponse[DeployRecord])
async def get_deployment(deploy_id: str):
    record = _deployments.get(deploy_id)
    if not record:
        return ApiResponse(code=404, message="Deployment not found")

    record["status"] = _advance_status(record)
    if record["status"] == "success" and not record["url"]:
        short_id = record["deploy_id"][:8]
        record["url"] = f"https://agenthub-deploy-{short_id}.vercel.app"

    return ApiResponse(data=DeployRecord(**record))
