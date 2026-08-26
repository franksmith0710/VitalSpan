"""Tests for DeepTalk product integration executor (no live API for most cases)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
EXECUTOR = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "deeptalk-product" / "executor"
TREND_SAMPLE = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "examples" / "custom-viz-trend-line.json"
GENERIC_HTML = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "examples" / "generic-blank-html.json"
CONTRACT_CARD = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "assets" / "contract_card.json"


def _env() -> dict[str, str]:
    env = os.environ.copy()
    env["VITALSPAN_ROOT"] = str(REPO_ROOT)
    return env


def _run_cli(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(EXECUTOR / "cli.py"), *args],
        cwd=str(EXECUTOR.parent),
        env=_env(),
        capture_output=True,
        text=True,
        check=False,
    )


def test_completion_gate_passes_with_artifact_id() -> None:
    proc = _run_cli(
        "vitalspan_completion_gate",
        "--workflow",
        "2",
        "--agent-summary",
        "工作流 ② 完成 ok artifactId=00000000-0000-4000-8000-000000000001",
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout
    assert "ok completion_gate passed" in proc.stdout


def test_completion_gate_blocks_output_delivery() -> None:
    proc = _run_cli(
        "vitalspan_completion_gate",
        "--workflow",
        "2",
        "--agent-summary",
        "已保存到 output/vs-trend-chart.json",
    )
    assert proc.returncode != 0
    assert "gate blocked" in proc.stderr or "forbidden" in proc.stderr.lower()


def test_publish_validate_only_via_executor_cli() -> None:
    assert TREND_SAMPLE.is_file()
    rel = Path("examples/custom-viz-trend-line.json")
    proc = _run_cli(
        "vitalspan_publish_artifact",
        "--file",
        rel.as_posix(),
        "--validate-only",
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout
    assert "preflight ok" in proc.stdout
    assert "styleComplianceTier=full" in proc.stdout


def test_agent_tools_schema_lists_twenty_tools() -> None:
    schema_path = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "deeptalk-product" / "agent-tools.schema.json"
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    names = {t["name"] for t in data["tools"]}
    assert names == {
        "vitalspan_health_check",
        "vitalspan_get_contract_card",
        "vitalspan_scaffold_artifact",
        "vitalspan_validate_artifact",
        "vitalspan_publish_artifact",
        "vitalspan_list_artifacts",
        "vitalspan_delete_artifact",
        "vitalspan_get_artifact",
        "vitalspan_list_artifact_dashboard_refs",
        "vitalspan_delete_dashboard",
        "vitalspan_validate_chart_config",
        "vitalspan_route_request",
        "vitalspan_list_layout_templates",
        "vitalspan_list_chart_types",
        "vitalspan_compose_dashboard",
        "vitalspan_get_dashboard_layout",
        "vitalspan_create_dashboard",
        "vitalspan_list_dashboards",
        "vitalspan_upload_dashboard",
        "vitalspan_completion_gate",
    }


def test_route_request_sankey_via_cli() -> None:
    proc = _run_cli("vitalspan_route_request", "--text", "客户要流向地图桑基图")
    assert proc.returncode == 0, proc.stderr or proc.stdout
    payload = json.loads(proc.stdout)
    assert payload["ok"] is True
    assert payload["workflow"] == "1"
    assert payload.get("chartType") == "sankey"


def test_contract_card_json_valid() -> None:
    data = json.loads(CONTRACT_CARD.read_text(encoding="utf-8"))
    assert data["version"] == 1
    assert "mount" in data and "style" in data


def test_get_contract_card_via_cli() -> None:
    proc = _run_cli("vitalspan_get_contract_card")
    assert proc.returncode == 0, proc.stderr or proc.stdout
    payload = json.loads(proc.stdout)
    assert payload["publishGate"]


def test_scaffold_generic_blank_via_cli() -> None:
    proc = _run_cli(
        "vitalspan_scaffold_artifact",
        "--id",
        "test-hex-kpi",
        "--name",
        "测试六边形",
        "--runtime",
        "html",
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout
    out = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "examples" / "test-hex-kpi.json"
    assert out.is_file()
    bundle = json.loads(out.read_text(encoding="utf-8"))
    assert bundle["manifest"]["id"] == "test-hex-kpi"
    assert "renderBusiness" in bundle["files"]["index.html"]
    out.unlink(missing_ok=True)


def test_validate_generic_blank_full_via_cli() -> None:
    assert GENERIC_HTML.is_file()
    proc = _run_cli(
        "vitalspan_validate_artifact",
        "--file",
        "examples/generic-blank-html.json",
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout
    assert "ok validate stamp=" in proc.stdout
    assert "styleComplianceTier=full" in proc.stdout
    assert "warnings=0" in proc.stdout


def test_validate_json_includes_structured_fixes() -> None:
    tools = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "tools"
    proc = subprocess.run(
        [
            sys.executable,
            str(tools / "validate-ai-viz-bundle.py"),
            "--file",
            str(GENERIC_HTML),
            "--json",
        ],
        cwd=str(REPO_ROOT / "docs" / "api" / "vs-ai-spec"),
        env=_env(),
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout
    payload = json.loads(proc.stdout)
    assert payload["ok"] is True
    assert payload["styleComplianceTier"] == "full"
    assert payload["fixes"] == []
    assert "vitalspan_publish_artifact" in payload["nextTools"]


def test_hex_kpi_grid_validate_and_publish_cli() -> None:
    hex_path = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "examples" / "hex-kpi-grid.json"
    assert hex_path.is_file(), "run tools/build-hex-kpi-example.py first"

    proc = _run_cli(
        "vitalspan_validate_artifact",
        "--file",
        "examples/hex-kpi-grid.json",
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout
    assert "ok validate stamp=" in proc.stdout
    assert "styleComplianceTier=full" in proc.stdout
    assert "warnings=0" in proc.stdout

    proc = _run_cli(
        "vitalspan_publish_artifact",
        "--file",
        "examples/hex-kpi-grid.json",
        "--validate-only",
    )
    assert proc.returncode == 0, proc.stderr or proc.stdout
    assert "preflight ok" in proc.stdout or "styleComplianceTier=full" in proc.stdout


def test_config_example_json_valid() -> None:
    path = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "deeptalk-product" / "config.example.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    assert "vitalspan" in data
    assert data["vitalspan"]["api_base"].endswith("/api/v1")
