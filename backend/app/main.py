from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_v1_router
from app.auth.middleware import AuthMiddleware
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import TraceIdMiddleware
from app.ingestion.scheduler import get_scheduler, refresh_all_jobs

settings = get_settings()
configure_logging(settings)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    scheduler = get_scheduler()
    refresh_all_jobs()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(
    title="VitalSpan",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TraceIdMiddleware)
app.add_middleware(AuthMiddleware)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_v1_router, prefix="/api/v1")
