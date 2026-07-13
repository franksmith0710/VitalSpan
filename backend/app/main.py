from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_v1_router
from app.auth.deps import PermissionDeniedError
from app.auth.middleware import AuthMiddleware
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.middleware import TraceIdMiddleware
from app.core.middleware.https_audit_guard import HttpsAuditGuardMiddleware
from app.ingestion.scheduler import get_scheduler, refresh_all_jobs
from app.reports.scheduler.jobs import get_report_scheduler, refresh_schedule_jobs
from app.openapi.extensions import customize_openapi

settings = get_settings()
configure_logging(settings)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    scheduler = get_scheduler()
    refresh_all_jobs()
    scheduler.start()
    refresh_schedule_jobs()
    report_scheduler = get_report_scheduler()
    report_scheduler.start()
    yield
    report_scheduler.shutdown(wait=False)
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
app.add_middleware(HttpsAuditGuardMiddleware)


@app.exception_handler(PermissionDeniedError)
async def _permission_denied_handler(_request: Request, exc: PermissionDeniedError) -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={
            "code": "PERMISSION_DENIED",
            "message": f"Missing required permission: {exc.permission}",
            "detail": None,
        },
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_v1_router, prefix="/api/v1")


def _openapi() -> dict:
    return customize_openapi(app)


app.openapi = _openapi
