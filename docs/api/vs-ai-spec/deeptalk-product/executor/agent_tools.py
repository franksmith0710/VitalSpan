"""DeepTalk Agent tool dispatch — maps tool names to vs-ai-spec CLI."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone

from completion_gate import check_completion
from publish_executor import publish_file
from route_request import route_request
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


def vitalspan_scaffold_artifact(
    artifact_id: str,
    name: str,
    runtime: str = "html",
) -> AgentToolResult:
    template = "generic-blank-d3" if runtime == "d3" else "generic-blank-html"
    result = run_tool(
        "scaffold-custom-viz.py",
        "--id",
        artifact_id,
        "--name",
        name,
        "--template",
        template,
    )
    rel = f"examples/{artifact_id}.json"
    data = {"file": rel, "template": template}
    return AgentToolResult(
        "vitalspan_scaffold_artifact",
        result.ok,
        result.stdout,
        result.stderr,
        data if result.ok else None,
    )


def vitalspan_validate_artifact(file: str) -> AgentToolResult:
    result = run_tool("validate-ai-viz-bundle.py", "--file", file, "--json")
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    data: dict | None = None
    stdout = result.stdout
    if result.stdout.strip():
        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError:
            data = None
    ok = result.ok and bool(data and data.get("ok"))
    tier = (data or {}).get("styleComplianceTier")
    warn_count = len((data or {}).get("warnings") or [])
    ok = ok and tier == "full" and warn_count == 0
    if ok:
        stdout = (
            f"ok validate stamp={stamp}\n"
            f"styleComplianceTier={tier}\n"
            f"warnings={warn_count}\n"
        )
        if warn_count:
            stdout += "fix loop required before publish (see fixes in --json)\n"
    elif data:
        stdout = json.dumps({**data, "validateStamp": stamp}, ensure_ascii=False, indent=2)
    return AgentToolResult("vitalspan_validate_artifact", ok, stdout, result.stderr, data)


def vitalspan_get_contract_card() -> AgentToolResult:
    result = run_tool("get-contract-card.py")
    data: dict | None = None
    if result.stdout.strip():
        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError:
            data = None
    return AgentToolResult(
        "vitalspan_get_contract_card",
        result.ok and data is not None,
        result.stdout,
        result.stderr,
        data,
    )


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


def vitalspan_list_artifacts(limit: int = 100, offset: int = 0, query: str = "") -> AgentToolResult:
    args = ["--limit", str(limit), "--offset", str(offset)]
    if query.strip():
        args.extend(["--q", query.strip()])
    result = run_tool("list-ai-viz-artifacts.py", *args)
    return AgentToolResult("vitalspan_list_artifacts", result.ok, result.stdout, result.stderr)


def vitalspan_get_artifact(artifact_id: str, file: str | None = None) -> AgentToolResult:
    args = [artifact_id]
    if file:
        args.extend(["--file", file])
    result = run_tool("get-ai-viz-artifact.py", *args)
    return AgentToolResult("vitalspan_get_artifact", result.ok, result.stdout, result.stderr)


def vitalspan_delete_artifact(artifact_id: str, *, unlink: bool = False) -> AgentToolResult:
    args = [artifact_id]
    if unlink:
        args.append("--unlink")
    result = run_tool("delete-ai-viz-artifact.py", *args)
    return AgentToolResult("vitalspan_delete_artifact", result.ok, result.stdout, result.stderr)


def vitalspan_list_artifact_dashboard_refs(artifact_id: str) -> AgentToolResult:
    result = run_tool("list-artifact-dashboard-refs.py", artifact_id)
    return AgentToolResult(
        "vitalspan_list_artifact_dashboard_refs",
        result.ok,
        result.stdout,
        result.stderr,
    )


def vitalspan_delete_dashboard(dashboard_id: str) -> AgentToolResult:
    result = run_tool("delete-dashboard.py", dashboard_id)
    return AgentToolResult("vitalspan_delete_dashboard", result.ok, result.stdout, result.stderr)


def vitalspan_validate_chart_config(file: str) -> AgentToolResult:
    result = run_tool("validate-chart-config.py", "--file", file)
    ok = result.ok and "ok chartType=" in result.stdout
    return AgentToolResult("vitalspan_validate_chart_config", ok, result.stdout, result.stderr)


def vitalspan_route_request(text: str) -> AgentToolResult:
    route = route_request(text)
    stdout = json.dumps(route.to_dict(), ensure_ascii=False, indent=2)
    return AgentToolResult("vitalspan_route_request", route.ok, stdout, "")


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
