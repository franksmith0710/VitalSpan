import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from sqlalchemy import text
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_v1_router
from app.auth.deps import PermissionDeniedError
from app.auth.middleware import AuthMiddleware
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.core.nfr.runtime_guard import assert_runtime_compliant
from app.core.middleware import TraceIdMiddleware
from app.core.middleware.https_audit_guard import HttpsAuditGuardMiddleware
from app.ingestion.scheduler import get_scheduler, refresh_all_jobs
from app.reports.scheduler.jobs import get_report_scheduler, refresh_schedule_jobs
from app.openapi.extensions import customize_openapi

settings = get_settings()
configure_logging(settings)
logger = logging.getLogger(__name__)


def _warm_meta_database() -> None:
    """预热元数据库连接池；开发环境顺带修复 admin 孤儿绑定与样例源凭证。"""
    from app.auth.bootstrap_root import ensure_admin_username_root_binding
    from app.auth.models import get_meta_session
    from app.dashboard.templates.demo_datasource import ensure_official_demo_datasource
    from app.dashboard.templates.seed import seed_builtin_dashboard_templates
    from app.datasources.dev_credential_repair import repair_dev_datasource_credentials

    session = get_meta_session()
    try:
        session.execute(text("SELECT 1"))
        if settings.ensure_official_demo_datasource:
            try:
                ensure_official_demo_datasource(session)
            except Exception:
                logger.warning("official_demo_datasource_seed_failed", exc_info=True)
        try:
            inserted = seed_builtin_dashboard_templates(session)
            if inserted:
                logger.info("dashboard_template_seed_ok inserted=%s", inserted)
        except Exception:
            logger.warning("dashboard_template_seed_failed", exc_info=True)
        if settings.vitalspan_env == "development":
            ensure_admin_username_root_binding(
                session,
                username=settings.vitalspan_bootstrap_admin_username,
            )
            repair_dev_datasource_credentials(session)
            if settings.dev_report_seed:
                try:
                    from app.reports.dev_seed import seed_dev_reports

                    counts = seed_dev_reports(session)
                    logger.info("report_dev_seed_ok %s", counts)
                except Exception:
                    logger.warning("report_dev_seed_failed", exc_info=True)
    except Exception:
        logger.warning("meta_db_warmup_failed", exc_info=True)
    finally:
        session.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    assert_runtime_compliant()
    _warm_meta_database()
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
