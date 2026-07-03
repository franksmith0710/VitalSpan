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
