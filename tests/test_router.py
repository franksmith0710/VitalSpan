"""T-RTR-01~02: api_v1_router 路由表模块级断言。"""

from app.api.v1.router import api_v1_router


def _route_paths() -> list[str]:
    paths: list[str] = []

    def collect(router, prefix: str = "") -> None:
        for route in router.routes:
            if hasattr(route, "original_router"):
                sub_prefix = getattr(route.include_context, "prefix", "") or ""
                collect(route.original_router, prefix + sub_prefix)
            else:
                segment = getattr(route, "path", "") or ""
                paths.append(prefix + segment)

    collect(api_v1_router)
    return paths


def test_api_v1_router_includes_me_route():
    """T-RTR-01: api_v1_router 含 /me 路由。"""
    paths = _route_paths()
    assert any("/me" in path or path.endswith("/me") for path in paths), paths


def test_api_v1_router_includes_ingestion_prefix():
    """T-RTR-02: api_v1_router 含 ingestion 前缀或 sync-jobs 段。"""
    paths = _route_paths()
    assert any(
        path.startswith("/ingestion") or "sync-jobs" in path for path in paths
    ), paths
