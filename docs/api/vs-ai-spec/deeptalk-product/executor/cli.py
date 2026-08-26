#!/usr/bin/env python3
"""DeepTalk server CLI — invoke VitalSpan integration tools."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_EXECUTOR = Path(__file__).resolve().parent
if str(_EXECUTOR) not in sys.path:
    sys.path.insert(0, str(_EXECUTOR))

from agent_tools import (
    vitalspan_completion_gate,
    vitalspan_delete_artifact,
    vitalspan_delete_dashboard,
    vitalspan_get_artifact,
    vitalspan_get_contract_card,
    vitalspan_health_check,
    vitalspan_list_artifact_dashboard_refs,
    vitalspan_list_artifacts,
    vitalspan_publish_artifact,
    vitalspan_route_request,
    vitalspan_scaffold_artifact,
    vitalspan_validate_artifact,
    vitalspan_validate_chart_config,
    vitalspan_upload_dashboard,
)
from route_request import route_request  # noqa: F401 — re-export for tests


def _emit(result, json_out: bool) -> int:
    if json_out:
        payload = {
            "ok": result.ok,
            "tool": result.tool,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "data": result.data,
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        if result.stdout:
            sys.stdout.write(result.stdout)
        if result.stderr:
            sys.stderr.write(result.stderr)
    return 0 if result.ok else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="DeepTalk VitalSpan agent tools")
    parser.add_argument("tool", help="tool name from agent-tools.schema.json")
    parser.add_argument("--file", default=None)
    parser.add_argument("--id", default=None, help="bundle id slug for scaffold")
    parser.add_argument("--name", default=None, help="display name for scaffold")
    parser.add_argument("--runtime", choices=["html", "d3"], default="html")
    parser.add_argument("--artifact-id", default=None)
    parser.add_argument("--dashboard-id", default=None)
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--workflow", choices=["1", "2", "3"], default=None)
    parser.add_argument("--agent-summary", default="")
    parser.add_argument("--tool-stdout", default="")
    parser.add_argument("--text", default="", help="natural language for route_request")
    parser.add_argument("--q", default="", help="filter for list_artifacts")
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--health-first", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    name = args.tool
    if name == "vitalspan_health_check":
        return _emit(vitalspan_health_check(), args.json)
    if name == "vitalspan_get_contract_card":
        return _emit(vitalspan_get_contract_card(), args.json)
    if name == "vitalspan_scaffold_artifact":
        slug = args.id or args.artifact_id
        if not slug or not args.name:
            raise SystemExit("--id and --name required")
        return _emit(
            vitalspan_scaffold_artifact(slug, args.name, runtime=args.runtime),
            args.json,
        )
    if name == "vitalspan_validate_artifact":
        if not args.file:
            raise SystemExit("--file required")
        return _emit(vitalspan_validate_artifact(args.file), args.json)
    if name == "vitalspan_publish_artifact":
        if not args.file:
            raise SystemExit("--file required")
        return _emit(
            vitalspan_publish_artifact(
                args.file,
                artifact_id=args.artifact_id,
                validate_only=args.validate_only,
                health_first=args.health_first,
            ),
            args.json,
        )
    if name == "vitalspan_list_artifacts":
        return _emit(vitalspan_list_artifacts(args.limit, args.offset, query=args.q), args.json)
    if name == "vitalspan_get_artifact":
        if not args.artifact_id:
            raise SystemExit("--artifact-id required")
        return _emit(vitalspan_get_artifact(args.artifact_id, file=args.file), args.json)
    if name == "vitalspan_delete_artifact":
        if not args.artifact_id:
            raise SystemExit("--artifact-id required")
        return _emit(vitalspan_delete_artifact(args.artifact_id), args.json)
    if name == "vitalspan_list_artifact_dashboard_refs":
        if not args.artifact_id:
            raise SystemExit("--artifact-id required")
        return _emit(vitalspan_list_artifact_dashboard_refs(args.artifact_id), args.json)
    if name == "vitalspan_delete_dashboard":
        if not args.dashboard_id:
            raise SystemExit("--dashboard-id required")
        return _emit(vitalspan_delete_dashboard(args.dashboard_id), args.json)
    if name == "vitalspan_validate_chart_config":
        if not args.file:
            raise SystemExit("--file required")
        return _emit(vitalspan_validate_chart_config(args.file), args.json)
    if name == "vitalspan_route_request":
        if not args.text:
            raise SystemExit("--text required")
        return _emit(vitalspan_route_request(args.text), args.json)
    if name == "vitalspan_upload_dashboard":
        if not args.dashboard_id or not args.file:
            raise SystemExit("--dashboard-id and --file required")
        return _emit(vitalspan_upload_dashboard(args.dashboard_id, args.file), args.json)
    if name == "vitalspan_completion_gate":
        if not args.workflow or not args.agent_summary:
            raise SystemExit("--workflow and --agent-summary required")
        return _emit(
            vitalspan_completion_gate(args.workflow, args.agent_summary, args.tool_stdout),
            args.json,
        )
    raise SystemExit(f"unknown tool: {name}")


if __name__ == "__main__":
    raise SystemExit(main())
