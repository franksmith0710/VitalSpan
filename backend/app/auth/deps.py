from fastapi import HTTPException, Request
from pydantic import BaseModel


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
