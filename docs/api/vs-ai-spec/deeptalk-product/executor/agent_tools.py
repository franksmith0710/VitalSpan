"""DeepTalk Agent tool dispatch — maps tool names to vs-ai-spec CLI."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass

from completion_gate import check_completion
from publish_executor import publish_file
from subprocess_runner import run_tool


@dataclass
class AgentToolResult:
    tool: str
    ok: bool
    stdout: str
    stderr: str
    data: dict | None = None


def vitalspan_health_check() -> AgentToolResult:
    result = run_tool("check-vitalspan-health.py")
    return AgentToolResult("vitalspan_health_check", result.ok, result.stdout, result.stderr)


def vitalspan_publish_artifact(
    file: str,
    artifact_id: str | None = None,
    validate_only: bool = False,
    health_first: bool = False,
) -> AgentToolResult:
    outcome = publish_file(
        file,
        artifact_id=artifact_id,
        validate_only=validate_only,
        health_first=health_first,
    )
    return AgentToolResult(
        "vitalspan_publish_artifact",
        outcome.ok,
        outcome.stdout,
        outcome.stderr,
        outcome.to_dict(),
    )


def vitalspan_list_artifacts(limit: int = 100, offset: int = 0) -> AgentToolResult:
    result = run_tool("list-ai-viz-artifacts.py", "--limit", str(limit), "--offset", str(offset))
    return AgentToolResult("vitalspan_list_artifacts", result.ok, result.stdout, result.stderr)


def vitalspan_delete_artifact(artifact_id: str) -> AgentToolResult:
    result = run_tool("delete-ai-viz-artifact.py", artifact_id)
    return AgentToolResult("vitalspan_delete_artifact", result.ok, result.stdout, result.stderr)


def vitalspan_upload_dashboard(dashboard_id: str, file: str) -> AgentToolResult:
    result = run_tool(
        "upload-dashboard-layout.py",
        "--dashboard-id",
        dashboard_id,
        "--file",
        file,
    )
    return AgentToolResult("vitalspan_upload_dashboard", result.ok, result.stdout, result.stderr)


def vitalspan_completion_gate(workflow: str, agent_summary: str, tool_stdout: str = "") -> AgentToolResult:
    gate = check_completion(workflow, agent_summary, tool_stdout)
    stdout = ""
    if gate.ok:
        stdout = "ok completion_gate passed\n"
        if gate.artifact_id:
            stdout += f"artifactId={gate.artifact_id}\n"
        if gate.dashboard_id:
            stdout += f"dashboardId={gate.dashboard_id}\n"
    return AgentToolResult(
        "vitalspan_completion_gate",
        gate.ok,
        stdout,
        "\n".join(gate.reasons),
        gate.to_dict(),
    )


TOOL_NAMES = {
    "vitalspan_health_check": vitalspan_health_check,
    "vitalspan_publish_artifact": None,
    "vitalspan_list_artifacts": None,
    "vitalspan_delete_artifact": None,
    "vitalspan_upload_dashboard": None,
    "vitalspan_completion_gate": None,
}
