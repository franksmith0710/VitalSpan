import uuid

from fastapi import HTTPException, Request
from pydantic import BaseModel

from app.auth.models import get_meta_session
from app.auth.users import service as user_service


class UserContext(BaseModel):
    id: str
    username: str
    roles: list[str]


async def get_current_user(request: Request) -> UserContext:
    user = getattr(request.state, "user", None)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail={"code": "UNAUTHORIZED", "message": "Not authenticated", "detail": None},
        )
    return user


def resolve_user_roles(user_id: str) -> list[str]:
    session = get_meta_session()
    try:
        return user_service.resolve_role_codes_for_user(session, uuid.UUID(user_id))
    finally:
        session.close()
