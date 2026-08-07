from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse, Response

from app.auth.deps import UserContext, require_permission
from app.reports.catalog.errors import ReportCatalogError
from app.reports.contract import ReportCenterPreferencesOut
from app.reports.scheduler.errors import ScheduleError
from app.reports import service as report_service
from app.reports.scheduler.schemas import ScheduleUpdate

PERM_READ = "report:read"
PERM_MANAGE = "report:manage"

router = APIRouter(prefix="/center", tags=["reports-center"])


@router.get("/preferences", response_model=None)
def get_center_preferences(
    user: Annotated[UserContext, Depends(require_permission(PERM_READ))],
):
    return report_service.get_center_preferences(user)


@router.put("/preferences", response_model=None)
def update_center_preferences(
    payload: ReportCenterPreferencesOut,
    user: Annotated[UserContext, Depends(require_permission(PERM_READ))],
):
    from app.reports import center_prefs

    return center_prefs.set_favorites(user, payload.favorites).model_dump(by_alias=True)


@router.post("/recent", status_code=204, response_model=None)
def record_recent_view(
    payload: dict,
    user: Annotated[UserContext, Depends(require_permission(PERM_READ))],
):
    from app.reports import center_prefs

    center_prefs.record_recent_view(
        user,
        resource_type=payload.get("resourceType", ""),
        resource_id=payload.get("resourceId", ""),
        resource_label=payload.get("resourceLabel"),
    )
    return None
