from __future__ import annotations

import uuid

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.auth.deps import UserContext
from app.reports.scheduler import service as scheduler_service
from app.reports.scheduler.executor import semi_real_execute_schedule

_scheduler: BackgroundScheduler | None = None
_SYSTEM_ACTOR = UserContext(id="schedule-system", username="schedule-system", roles=["admin"])


def get_report_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
    return _scheduler


def _tick_execute(schedule_id: str) -> None:
    sid = uuid.UUID(schedule_id)
    key = f"cron-{schedule_id}-{uuid.uuid4().hex[:8]}"
    semi_real_execute_schedule(sid, key, _SYSTEM_ACTOR)


def register_job_on_transition(schedule_id: uuid.UUID, row: dict) -> None:
    if row["status"] != "scheduled":
        return
    scheduler = get_report_scheduler()
    scheduler.add_job(
        _tick_execute,
        trigger=CronTrigger.from_crontab(row["cron"], timezone=row["timezone"]),
        id=str(schedule_id),
        kwargs={},
        replace_existing=True,
        args=[str(schedule_id)],
    )


def remove_job_on_cancel(schedule_id: uuid.UUID) -> None:
    scheduler = get_report_scheduler()
    job_id = str(schedule_id)
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)


def refresh_schedule_jobs() -> None:
    scheduler = get_report_scheduler()
    for job in scheduler.get_jobs():
        scheduler.remove_job(job.id)
    for row in scheduler_service.iter_scheduled_rows():
        register_job_on_transition(row["id"], row)
