import logging
import warnings
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .core.database import engine, Base
from .core.redis import close_redis
from .models import SessionAgent  # noqa: F401 — ensure create_all sees it
from .routes import agents, auth, deploy, messages, sessions, users, websocket

logger = logging.getLogger(__name__)

settings = get_settings()

# Startup safety checks
if settings.SECRET_KEY == "change-me-in-production":
    warnings.warn(
        "SECRET_KEY is using the default value! Set the SECRET_KEY environment "
        "variable before deploying to production.",
        stacklevel=1,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (dev convenience)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await close_redis()
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(sessions.router, prefix=settings.API_V1_PREFIX)
app.include_router(agents.router, prefix=settings.API_V1_PREFIX)
app.include_router(messages.router, prefix=settings.API_V1_PREFIX)
app.include_router(deploy.router)
app.include_router(websocket.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
