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


def test_agent_tools_schema_lists_six_tools() -> None:
    schema_path = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "deeptalk-product" / "agent-tools.schema.json"
    data = json.loads(schema_path.read_text(encoding="utf-8"))
    names = {t["name"] for t in data["tools"]}
    assert names == {
        "vitalspan_health_check",
        "vitalspan_publish_artifact",
        "vitalspan_list_artifacts",
        "vitalspan_delete_artifact",
        "vitalspan_upload_dashboard",
        "vitalspan_completion_gate",
    }


def test_config_example_json_valid() -> None:
    path = REPO_ROOT / "docs" / "api" / "vs-ai-spec" / "deeptalk-product" / "config.example.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    assert "vitalspan" in data
    assert data["vitalspan"]["api_base"].endswith("/api/v1")
