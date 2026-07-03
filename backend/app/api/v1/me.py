from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.deps import UserContext, get_current_user

router = APIRouter(tags=["auth"])


class UserResponse(BaseModel):
    id: str
    username: str
    roles: list[str]


@router.get("/me", response_model=UserResponse)
async def read_me(
    current_user: Annotated[UserContext, Depends(get_current_user)],
) -> UserContext:
    return current_user
