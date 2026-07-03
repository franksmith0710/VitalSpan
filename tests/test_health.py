def test_health_returns_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_cors_preflight(client):
    """T-HLT-02: OPTIONS /health CORS 预检含 Access-Control-Allow-Origin。"""
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_openapi_json_public(client):
    """T-HLT-03: GET /openapi.json 公开可访问。"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    body = response.json()
    assert "openapi" in body


def test_docs_public(client):
    """T-HLT-04: GET /docs 公开可访问。"""
    response = client.get("/docs")
    assert response.status_code == 200


def test_unknown_route_returns_404(client, auth_headers):
    """T-HLT-05: GET /nonexistent-route-xyz → 404（经鉴权后由路由层返回）。"""
    response = client.get("/nonexistent-route-xyz", headers=auth_headers)
    assert response.status_code == 404


def test_openapi_paths_include_health_and_me(client):
    """T-HLT-06/07: OpenAPI paths 含 /health 与 /api/v1/me。"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/health" in paths
    assert "/api/v1/me" in paths


def test_health_cors_preflight_regression(client):
    """T-HLT-08: CORS 预检回归（中间件链未破坏公开路径）。"""
    response = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_health_cors_preflight_illegal_origin_no_acao(client):
    """T-HLT-09: OPTIONS /health 非法 Origin 无 Access-Control-Allow-Origin。"""
    response = client.options(
        "/health",
        headers={
            "Origin": "http://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 400
    allow_origin = response.headers.get("access-control-allow-origin")
    assert allow_origin is None or allow_origin != "http://evil.example"


def test_redoc_public(client):
    """T-HLT-10: GET /redoc 公开可访问。"""
    response = client.get("/redoc")
    assert response.status_code == 200


def test_health_get_allowed_origin_returns_acao(client):
    """T-HLT-11: GET /health 带允许 Origin 返回 ACAO。"""
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_openapi_json_has_version_key(client):
    """T-HLT-12: OpenAPI 文档含 openapi 3.x 版本键。"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    body = response.json()
    assert "openapi" in body
    assert str(body["openapi"]).startswith("3.")


def test_openapi_info_metadata(client):
    """T-HLT-13: OpenAPI info.title/version 元数据。"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    info = response.json()["info"]
    assert info["title"] == "VitalSpan"
    assert info["version"] == "0.1.0"


def test_health_consecutive_requests_stable(client):
    """T-HLT-14: 连续 GET /health 稳定（lifespan/scheduler）。"""
    for _ in range(3):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.headers.get("X-Trace-Id")


def test_openapi_paths_include_ingestion_sync_jobs(client):
    """T-HLT-15: OpenAPI paths 含 ingestion sync-jobs。"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/ingestion/sync-jobs" in paths
