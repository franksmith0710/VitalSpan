from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.auth.deps import UserContext
from app.auth.models import get_meta_session
from app.auth.users import service as user_service
from app.core.config import Settings, get_settings

PUBLIC_PATHS: frozenset[str] = frozenset({
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
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
        if (
            token == "dev"
            and self.settings.vitalspan_env == "development"
        ):
            session = get_meta_session()
            try:
                try:
                    db_roles = user_service.resolve_role_codes_for_username(session, "dev")
                except (OperationalError, ProgrammingError):
                    db_roles = []
            finally:
                session.close()
            roles = db_roles if db_roles else ["admin"]
            request.state.user = UserContext(id="dev", username="dev", roles=roles)
            return await call_next(request)

        return _unauthorized_response()
