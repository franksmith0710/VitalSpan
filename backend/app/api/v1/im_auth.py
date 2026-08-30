from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth.im_oauth.oauth import ImOAuthError
from app.auth.im_oauth.redirect import sanitize_redirect_after
from app.auth.im_oauth.service import complete_callback
from app.auth.models import get_meta_session

router = APIRouter(prefix="/auth/im", tags=["auth"])

ImChannelPath = Literal["dingtalk", "wecom", "feishu"]


def _db() -> Session:
    session = get_meta_session()
    try:
        yield session
    finally:
        session.close()


@router.get("/{channel}/callback", response_model=None)
def im_oauth_callback(
    channel: ImChannelPath,
    db: Annotated[Session, Depends(_db)],
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    base = "/admin/account/profile"
    if error:
        return RedirectResponse(
            url=f"{base}?imBind={channel}&status=error&message={error}",
            status_code=302,
        )
    if not code or not state:
        return RedirectResponse(
            url=f"{base}?imBind={channel}&status=error&message=missing_code",
            status_code=302,
        )
    try:
        _, redirect_after = complete_callback(db, channel=channel, code=code, state=state)
        redirect_after = sanitize_redirect_after(redirect_after)
        sep = "&" if "?" in redirect_after else "?"
        return RedirectResponse(
            url=f"{redirect_after}{sep}imBind={channel}&status=success",
            status_code=302,
        )
    except ImOAuthError as exc:
        return RedirectResponse(
            url=f"{base}?imBind={channel}&status=error&message={exc.code}",
            status_code=302,
        )
