import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.auth.deps import UserContext
from app.auth.jwt import JwtError, decode_access_token
from app.auth.models import get_meta_session
from app.auth.users import service as user_service
from app.core.config import Settings, get_settings

PUBLIC_PATHS: frozenset[str] = frozenset({
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/v1/auth/login",
})


def _unauthorized_response() -> JSONResponse:
    return JSONResponse(
        status_code=401,
        content={"code": "UNAUTHORIZED", "message": "Missing or invalid bearer token", "detail": None},
    )


class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings: Settings | None = None) -> None:
        super().__init__(app)
        self.settings = settings or get_settings()

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if path in PUBLIC_PATHS or path.startswith("/docs"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return _unauthorized_response()

        token = auth_header.removeprefix("Bearer ").strip()
        try:
            claims = decode_access_token(token)
            user_id = claims.get("sub")
            username = claims.get("username", "")
            if not user_id:
                return _unauthorized_response()
        except JwtError:
            return _unauthorized_response()

        session = get_meta_session()
        db_roles: list[str] = []
        try:
            try:
                user_uuid = uuid.UUID(str(user_id))
                db_roles = user_service.resolve_role_codes_for_user(session, user_uuid)
            except ValueError:
                db_roles = user_service.resolve_role_codes_for_username(session, str(username))
        except (OperationalError, ProgrammingError):
            db_roles = []
        finally:
            try:
                session.close()
            except (OperationalError, ProgrammingError):
                pass
        request.state.user = UserContext(id=str(user_id), username=str(username), roles=db_roles or ["admin"])
        return await call_next(request)
