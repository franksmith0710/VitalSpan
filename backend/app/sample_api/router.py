"""内置样例 REST API — 供连接管理 REST API 连接器本地测连 / Native 查询。"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials

router = APIRouter(prefix="/sample-api", tags=["sample-api"])

_basic = HTTPBasic(auto_error=False)

_SAMPLE_ORDERS: list[dict[str, object]] = [
    {
        "id": 1,
        "product_name": "Widget A",
        "amount": 12.5,
        "status": "active",
        "region": "华东",
        "updated_at": "2026-08-01T10:00:00Z",
    },
    {
        "id": 2,
        "product_name": "Widget B",
        "amount": 8.0,
        "status": "active",
        "region": "华北",
        "updated_at": "2026-08-02T11:30:00Z",
    },
    {
        "id": 3,
        "product_name": "Widget C",
        "amount": 19.9,
        "status": "pending",
        "region": "华南",
        "updated_at": "2026-08-03T09:15:00Z",
    },
    {
        "id": 4,
        "product_name": "Widget D",
        "amount": 3.2,
        "status": "deleted",
        "region": "西南",
        "updated_at": "2026-08-03T14:00:00Z",
    },
]


@router.get("/health")
def sample_api_health() -> dict[str, str]:
    return {"status": "ok", "service": "vitalspan-sample-api"}


@router.get("/orders")
def sample_api_orders() -> list[dict[str, object]]:
    """Native 查询 body: {\"path\": \"/sample-api/orders\"}"""
    return _SAMPLE_ORDERS


@router.get("/v1/orders")
def sample_api_orders_wrapped() -> dict[str, object]:
    """Native 查询 body: {\"path\": \"/sample-api/v1/orders\", \"jsonPath\": \"data\"}"""
    return {"data": _SAMPLE_ORDERS, "total": len(_SAMPLE_ORDERS)}


@router.get("/protected/orders")
def sample_api_protected_orders(
    credentials: HTTPBasicCredentials | None = Depends(_basic),
) -> list[dict[str, object]]:
    """Basic 认证测试：用户名 demo / 密码 demo"""
    if credentials is None or credentials.username != "demo" or credentials.password != "demo":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return _SAMPLE_ORDERS
