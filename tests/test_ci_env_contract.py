"""T-CI-01~03: CI workflow env 与 conftest 默认值对齐（BOOT-006）。"""

import re
from pathlib import Path

import pytest

CONFTEST_DEFAULTS = {
    "DATABASE_URL": "postgresql+psycopg://vitalspan:vitalspan@localhost:5432/vitalspan",
    "SECRET_KEY": "ci-test-secret-key-min-32-chars-long!!",
    "CREDENTIAL_FERNET_KEY": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
}

CI_YML = Path(__file__).resolve().parents[1] / ".github" / "workflows" / "ci.yml"


@pytest.fixture(scope="module")
def ci_yml_text() -> str:
    return CI_YML.read_text(encoding="utf-8")


def _extract_backend_env_value(text: str, key: str) -> str:
    """从 backend job env 块提取 KEY: value。"""
    pattern = rf"^\s+{re.escape(key)}:\s+(.+)$"
    match = re.search(pattern, text, re.MULTILINE)
    assert match is not None, f"missing {key} in ci.yml backend env"
    return match.group(1).strip()


def test_ci_yml_backend_env_has_required_keys(ci_yml_text):
    """T-CI-01: ci.yml backend job env 含三必填键。"""
    for key in CONFTEST_DEFAULTS:
        assert f"{key}:" in ci_yml_text


def test_ci_env_values_match_conftest_defaults(ci_yml_text):
    """T-CI-02: ci env 默认值与 conftest setdefault 一致。"""
    for key, expected in CONFTEST_DEFAULTS.items():
        actual = _extract_backend_env_value(ci_yml_text, key)
        assert actual == expected, f"{key}: ci={actual!r} conftest={expected!r}"


def test_ci_frontend_job_has_test_build_check_design(ci_yml_text):
    """T-CI-03: frontend job 含 pnpm test、build、check:design。"""
    assert "pnpm test" in ci_yml_text
    assert "pnpm build" in ci_yml_text
    assert "check:design" in ci_yml_text
