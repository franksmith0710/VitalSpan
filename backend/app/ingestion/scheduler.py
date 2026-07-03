from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select

from app.ingestion.models import SyncJob, get_meta_session
from app.ingestion.sync_executor import run_job

_scheduler: BackgroundScheduler | None = None


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
    return _scheduler


def refresh_all_jobs() -> None:
    scheduler = get_scheduler()
    for job in scheduler.get_jobs():
        scheduler.remove_job(job.id)
    db = get_meta_session()
    try:
        jobs = db.scalars(select(SyncJob).where(SyncJob.enabled.is_(True))).all()
        for job in jobs:
            if not job.schedule_cron:
                continue
            scheduler.add_job(
                run_job,
                trigger=CronTrigger.from_crontab(job.schedule_cron),
                id=str(job.id),
                kwargs={"job_id": job.id, "trace_id": f"schedule-{job.id}"},
                replace_existing=True,
            )
    except Exception:
        pass
    finally:
        db.close()
