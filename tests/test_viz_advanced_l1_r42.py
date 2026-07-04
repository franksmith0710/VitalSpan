"""M9 viz advanced chart types L1 kickoff r42 smoke — VIZ-003/004/005/006/008."""
from __future__ import annotations

import uuid

import pytest

from app.viz.registry import (
    ChartTypeAlreadyRegisteredError,
    ChartTypeNotRegistered,
    ChartTypeRegistry,
    get_spec,
)
from app.viz.specs import ChartTypeSpec, FieldRule


def test_registry_register_get_roundtrip():
    """T-VIZ-R42-003-03(unit): 自定义 registry register→get 往返。"""
    reg = ChartTypeRegistry()
    spec = ChartTypeSpec(
        type="custom_x",
        display_name="自定义",
        category="advanced",
        renderer="echarts",
        field_rule=FieldRule(min_dimensions=1, max_dimensions=1),
    )
    reg.register(spec)
    assert reg.get("custom_x").category == "advanced"
    assert reg.has("custom_x") is True


def test_registry_duplicate_raises():
    """T-VIZ-R42-003-05a: 重复 type register → AlreadyRegistered。"""
    reg = ChartTypeRegistry()
    spec = ChartTypeSpec(type="dup", display_name="d", category="basic", renderer="table")
    reg.register(spec)
    with pytest.raises(ChartTypeAlreadyRegisteredError):
        reg.register(spec)


def test_get_spec_unknown_raises():
    """T-VIZ-R42-003-04: get_spec 未注册 → ChartTypeNotRegistered。"""
    with pytest.raises(ChartTypeNotRegistered):
        get_spec("no_such_type_xyz")


def test_builtin_get_spec_category():
    """T-VIZ-R42-003-03: builtin sankey category=flow（依赖 Task 2 注册）。"""
    assert get_spec("sankey").category == "flow"


from app.viz.builtin import register_builtin_chart_types
from app.viz.registry import export_chart_type_catalog


def test_catalog_has_nine_types_with_shape():
    """T-VIZ-R42-003-01: catalog 含 9 类型，每项字段齐备。"""
    catalog = export_chart_type_catalog()
    types = {c["type"] for c in catalog}
    assert {"table", "line", "bar", "pie", "gauge", "map", "sankey", "funnel", "graph"} <= types
    for item in catalog:
        for key in ("type", "displayName", "category", "renderer", "styleVariants", "fieldRule"):
            assert key in item, key


def test_catalog_has_advanced_types():
    """T-VIZ-R42-003-02: 高级类型 sankey/graph/map/funnel/gauge/pie 出现。"""
    types = {c["type"] for c in export_chart_type_catalog()}
    assert {"sankey", "graph", "map", "funnel", "gauge", "pie"} <= types


def test_register_builtin_idempotent():
    """T-VIZ-R42-003-06: register_builtin_chart_types 幂等，二次调用不抛。"""
    register_builtin_chart_types()
    register_builtin_chart_types()
    assert get_spec("bar").renderer == "echarts"


def test_get_charts_types_ok(client, auth_headers):
    """T-VIZ-R42-003-07: GET /charts/types → 200，9 项列表。"""
    resp = client.get("/api/v1/charts/types", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert isinstance(body, list)
    types = {c["type"] for c in body}
    assert {"sankey", "funnel", "graph", "map", "gauge", "pie"} <= types


def test_get_charts_types_unauthorized(client, unauthorized_headers):
    """T-VIZ-R42-003-08: GET /charts/types 无有效鉴权 → 401。"""
    resp = client.get("/api/v1/charts/types", headers=unauthorized_headers)
    assert resp.status_code == 401
