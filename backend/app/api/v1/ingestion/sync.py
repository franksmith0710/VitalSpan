from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import UserContext, require_permission

PERM_READ = "ingestion:read"
PERM_MANAGE = "ingestion:manage"
from app.core.config import get_settings
from app.ingestion.models import (
    EtlRuleSet,
    SourceConnectionIn,
    SourceConnectionOut,
    SourceConnectionUpdateIn,
    SyncJob,
    SyncRun,
    encrypt_password,
    get_meta_session,
)
from app.ingestion.scheduler import refresh_all_jobs
from app.ingestion.sync_executor import run_job

router = APIRouter(prefix="/ingestion", tags=["ingestion"])


class SyncJobCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    source: SourceConnectionIn
    target_table: str
    schedule_cron: str | None = None
    enabled: bool = True


class SyncJobUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    source: SourceConnectionUpdateIn
    target_table: str
    schedule_cron: str | None = None
    enabled: bool = True


class SyncJobSummary(BaseModel):
    id: uuid.UUID
    name: str
    source_type: str
    target_table: str
    enabled: bool
    schedule_cron: str | None


class SyncJobDetail(SyncJobSummary):
    source: SourceConnectionOut
    source_data_source_id: uuid.UUID | None = None


class SyncJobListResponse(BaseModel):
    items: list[SyncJobSummary]


class EtlRulesPayload(BaseModel):
    rules: list[dict[str, Any]]

    @field_validator("rules", mode="before")
    @classmethod
    def rules_must_be_list(cls, value: Any) -> Any:
        if not isinstance(value, list):
            raise ValueError("规则须为 JSON 列表")
        return value


class EtlRulesResponse(BaseModel):
    rules: list[dict[str, Any]]


class SyncRunItem(BaseModel):
    id: uuid.UUID
    status: str
    started_at: str
    finished_at: str | None
    rows_synced: int | None
    error_message: str | None
    trace_id: str
    retry_count: int


class SyncRunListResponse(BaseModel):
    items: list[SyncRunItem]


class RunAccepted(BaseModel):
    run_id: uuid.UUID
    status: str


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


def _to_source_out(job: SyncJob) -> SourceConnectionOut:
    return SourceConnectionOut(
        type=job.source_type,  # type: ignore[arg-type]
        host=job.source_host,
        port=job.source_port,
        database=job.source_database,
        username=job.source_username,
        table=job.source_table,
    )


def _apply_source(
    job: SyncJob,
    source: SourceConnectionIn | SourceConnectionUpdateIn,
    *,
    preserve_password: bool = False,
) -> None:
    job.source_type = source.type
    job.source_host = source.host
    job.source_port = source.port
    job.source_database = source.database
    job.source_username = source.username
    if not (preserve_password and not source.password):
        job.source_password_encrypted = encrypt_password(source.password)
    job.source_table = source.table


@router.get("/sync-jobs", response_model=SyncJobListResponse)
def list_sync_jobs(
    _: Annotated[UserContext, Depends(require_permission(PERM_READ))],
    db: Annotated[Session, Depends(_db)],
) -> SyncJobListResponse:
    jobs = db.scalars(select(SyncJob).order_by(SyncJob.created_at.desc())).all()
    return SyncJobListResponse(
        items=[
            SyncJobSummary(
                id=j.id,
                name=j.name,
                source_type=j.source_type,
                target_table=j.target_table,
                enabled=j.enabled,
                schedule_cron=j.schedule_cron,
            )
            for j in jobs
        ]
    )


@router.post("/sync-jobs", response_model=SyncJobDetail, status_code=status.HTTP_201_CREATED)
def create_sync_job(
    payload: SyncJobCreate,
    _: Annotated[UserContext, Depends(require_permission(PERM_MANAGE))],
    db: Annotated[Session, Depends(_db)],
) -> SyncJobDetail:
    job = SyncJob(
        name=payload.name,
        target_table=payload.target_table,
        schedule_cron=payload.schedule_cron,
        enabled=payload.enabled,
        source_data_source_id=None,
    )
    _apply_source(job, payload.source)
    db.add(job)
    db.flush()
    db.add(EtlRuleSet(job_id=job.id, rules=[]))
    db.commit()
    db.refresh(job)
    refresh_all_jobs()
    return SyncJobDetail(
        id=job.id,
        name=job.name,
        source_type=job.source_type,
        target_table=job.target_table,
        enabled=job.enabled,
        schedule_cron=job.schedule_cron,
        source=_to_source_out(job),
        source_data_source_id=job.source_data_source_id,
    )


@router.get("/sync-jobs/{job_id}", response_model=SyncJobDetail)
def get_sync_job(
    job_id: uuid.UUID,
    _: Annotated[UserContext, Depends(require_permission(PERM_READ))],
    db: Annotated[Session, Depends(_db)],
) -> SyncJobDetail:
    job = db.get(SyncJob, job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "任务不存在", "detail": None},
        )
    return SyncJobDetail(
        id=job.id,
        name=job.name,
        source_type=job.source_type,
        target_table=job.target_table,
        enabled=job.enabled,
        schedule_cron=job.schedule_cron,
        source=_to_source_out(job),
        source_data_source_id=job.source_data_source_id,
    )


@router.put("/sync-jobs/{job_id}", response_model=SyncJobDetail)
def update_sync_job(
    job_id: uuid.UUID,
    payload: SyncJobUpdate,
    _: Annotated[UserContext, Depends(require_permission(PERM_MANAGE))],
    db: Annotated[Session, Depends(_db)],
) -> SyncJobDetail:
    job = db.get(SyncJob, job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "任务不存在", "detail": None},
        )
    job.name = payload.name
    job.target_table = payload.target_table
    job.schedule_cron = payload.schedule_cron
    job.enabled = payload.enabled
    _apply_source(job, payload.source, preserve_password=True)
    db.commit()
    db.refresh(job)
    refresh_all_jobs()
    return SyncJobDetail(
        id=job.id,
        name=job.name,
        source_type=job.source_type,
        target_table=job.target_table,
        enabled=job.enabled,
        schedule_cron=job.schedule_cron,
        source=_to_source_out(job),
        source_data_source_id=job.source_data_source_id,
    )


@router.delete("/sync-jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sync_job(
    job_id: uuid.UUID,
    _: Annotated[UserContext, Depends(require_permission(PERM_MANAGE))],
    db: Annotated[Session, Depends(_db)],
) -> None:
    job = db.get(SyncJob, job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "任务不存在", "detail": None},
        )
    db.delete(job)
    db.commit()


@router.get("/sync-jobs/{job_id}/etl-rules", response_model=EtlRulesResponse)
def get_etl_rules(
    job_id: uuid.UUID,
    _: Annotated[UserContext, Depends(require_permission(PERM_READ))],
    db: Annotated[Session, Depends(_db)],
) -> EtlRulesResponse:
    rules = db.scalar(select(EtlRuleSet).where(EtlRuleSet.job_id == job_id))
    if rules is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "任务不存在", "detail": None},
        )
    return EtlRulesResponse(rules=rules.rules)


@router.put("/sync-jobs/{job_id}/etl-rules", response_model=EtlRulesResponse)
def put_etl_rules(
    job_id: uuid.UUID,
    payload: EtlRulesPayload,
    _: Annotated[UserContext, Depends(require_permission(PERM_MANAGE))],
    db: Annotated[Session, Depends(_db)],
) -> EtlRulesResponse:
    rules = db.scalar(select(EtlRuleSet).where(EtlRuleSet.job_id == job_id))
    if rules is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "任务不存在", "detail": None},
        )
    rules.rules = payload.rules
    db.commit()
    return EtlRulesResponse(rules=rules.rules)


@router.post("/sync-jobs/{job_id}/run", response_model=RunAccepted, status_code=202)
def trigger_run(
    job_id: uuid.UUID,
    request: Request,
    background_tasks: BackgroundTasks,
    _: Annotated[UserContext, Depends(require_permission(PERM_MANAGE))],
    db: Annotated[Session, Depends(_db)],
) -> RunAccepted:
    if not get_settings().analytics_database_url:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "ANALYTICS_DB_NOT_CONFIGURED",
                "message": "托管分析库未配置",
                "detail": None,
            },
        )
    job = db.get(SyncJob, job_id)
    if job is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "任务不存在", "detail": None},
        )
    existing_running = db.scalar(
        select(SyncRun.id)
        .where(SyncRun.job_id == job_id, SyncRun.status == "running")
        .limit(1)
    )
    if existing_running is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "RUN_ALREADY_IN_PROGRESS",
                "message": "该任务正在运行中",
                "detail": None,
            },
        )
    trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))
    run = SyncRun(job_id=job_id, status="running", trace_id=trace_id)
    db.add(run)
    db.commit()
    db.refresh(run)
    background_tasks.add_task(run_job, job_id, trace_id, run_id=run.id)
    return RunAccepted(run_id=run.id, status="running")


@router.get("/sync-jobs/{job_id}/runs", response_model=SyncRunListResponse)
def list_runs(
    job_id: uuid.UUID,
    _: Annotated[UserContext, Depends(require_permission(PERM_READ))],
    db: Annotated[Session, Depends(_db)],
    limit: int = 20,
) -> SyncRunListResponse:
    if db.get(SyncJob, job_id) is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "NOT_FOUND", "message": "任务不存在", "detail": None},
        )
    runs = db.scalars(
        select(SyncRun).where(SyncRun.job_id == job_id).order_by(SyncRun.started_at.desc()).limit(limit)
    ).all()
    return SyncRunListResponse(
        items=[
            SyncRunItem(
                id=r.id,
                status=r.status,
                started_at=r.started_at.isoformat(),
                finished_at=r.finished_at.isoformat() if r.finished_at else None,
                rows_synced=r.rows_synced,
                error_message=r.error_message,
                trace_id=r.trace_id,
                retry_count=r.retry_count,
            )
            for r in runs
        ]
    )
