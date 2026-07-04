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
