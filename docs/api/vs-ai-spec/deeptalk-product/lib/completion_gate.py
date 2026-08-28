"""Agent task completion gate — require artifactId or dashboardId."""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass

from config import load_config

ARTIFACT_ID_RE = re.compile(
    r"artifactId=([0-9a-fA-F-]{36})",
    re.IGNORECASE,
)
DASHBOARD_ID_RE = re.compile(
    r"dashboardId=([0-9a-fA-F-]{36})",
    re.IGNORECASE,
)
DASHBOARD_OK_RE = re.compile(
    r"ok\s+dashboardId=([0-9a-fA-F-]{36})",
    re.IGNORECASE,
)
LAYOUT_WIDGETS_RE = re.compile(r"layout widgets:\s*(\d+)", re.IGNORECASE)
DEMO_SUMMARY_RE = re.compile(
    r"演示|预览|能看|看到效果|完整效果|开箱即用|walkthrough|preview|有数据|打开就",
    re.IGNORECASE,
)
DEMO_STDOUT_MARK = "data binding: demo"
STYLE_SUMMARY_RE = re.compile(
    r"改色|配色|风格|边框|暖色|冷色|品牌|换肤|视觉|标题色|背景色|圆角|区分|紫金|橙金|大促风|已改.*色|统一.*色",
    re.IGNORECASE,
)
UPLOAD_DONE_MARK = "done: layout saved via upload"
VALIDATE_OK_RE = re.compile(r"validate\s+ok|dry-run ok|preflight ok", re.IGNORECASE)
TIER_FULL_RE = re.compile(r"styleComplianceTier=full", re.IGNORECASE)
TIER_BAD_RE = re.compile(r"styleComplianceTier=(partial|visual-only)", re.IGNORECASE)
WARNINGS_RE = re.compile(r"warnings?\s*[=:]\s*([1-9]\d*)", re.IGNORECASE)

FORBIDDEN_PHRASES = (
    "保存到 output",
    "saved to output",
    "output/ 目录",
    "output directory",
    "write_file 完成",
    "写到磁盘即交付",
    "可在工作区直接使用",
    "可在扩展中直接使用",
)

DEPRECATED_STYLE_PATTERNS = (
    "vs-cv-style-update",
    "getStyle()",
    ".vs-cv-style",
)


@dataclass
class GateResult:
    ok: bool
    workflow: str
    reasons: list[str]
    artifact_id: str | None = None
    dashboard_id: str | None = None

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "workflow": self.workflow,
            "artifactId": self.artifact_id,
            "dashboardId": self.dashboard_id,
            "reasons": self.reasons,
        }


def validate_workflow3_stdout(tool_stdout: str) -> list[str]:
    reasons: list[str] = []
    if not tool_stdout.strip():
        reasons.append(
            "workflow 3 requires tool_stdout from vitalspan_compose_dashboard or vitalspan_upload_dashboard",
        )
        return reasons
    if not DASHBOARD_OK_RE.search(tool_stdout):
        reasons.append("tool_stdout must contain ok dashboardId=<uuid> from compose or upload")
    if "next: vitalspan_upload_dashboard" in tool_stdout:
        reasons.append(
            "tool_stdout from create_dashboard is not workflow 3 completion — compose or upload required",
        )
    if "patch style only" in tool_stdout:
        reasons.append(
            "tool_stdout from get_dashboard_layout is not completion — upload after style patch",
        )
    if re.search(r"\nfile \S+", tool_stdout):
        reasons.append(
            "tool_stdout looks like get_dashboard_layout export — use compose or upload stdout",
        )
    widget_match = LAYOUT_WIDGETS_RE.search(tool_stdout)
    if not widget_match or int(widget_match.group(1)) < 1:
        reasons.append("tool_stdout must include layout widgets: N with N>=1 from compose or upload")
    return reasons


def validate_workflow3_summary_semantics(agent_summary: str, tool_stdout: str) -> list[str]:
    reasons: list[str] = []
    summary = agent_summary.strip()
    if not summary:
        return reasons
    if DEMO_SUMMARY_RE.search(summary) and DEMO_STDOUT_MARK not in tool_stdout:
        reasons.append(
            "summary claims demo/preview but tool_stdout missing data binding: demo — compose with data_binding=demo",
        )
    if STYLE_SUMMARY_RE.search(summary) and UPLOAD_DONE_MARK not in tool_stdout:
        reasons.append(
            "summary claims style/visual changes but tool_stdout missing upload delivery — pass upload_dashboard stdout after patch",
        )
    return reasons


def check_completion(workflow: str, agent_summary: str, tool_stdout: str = "") -> GateResult:
    text = f"{agent_summary}\n{tool_stdout}"
    reasons: list[str] = []
    cfg = load_config()

    lower = text.lower()
    for phrase in FORBIDDEN_PHRASES:
        if phrase.lower() in lower:
            reasons.append(f"forbidden phrase: {phrase}")

    for forbidden in cfg.forbidden_delivery_dirs:
        if f"{forbidden}/" in text or f"保存到 {forbidden}" in text:
            reasons.append(f"delivery treated as {forbidden}/ — must publish to VitalSpan API")

    artifact_id = None
    dashboard_id = None
    m = ARTIFACT_ID_RE.search(text)
    if m:
        artifact_id = m.group(1)
    d = DASHBOARD_ID_RE.search(text)
    if d:
        dashboard_id = d.group(1)

    wf = str(workflow)
    if wf == "2":
        if not artifact_id:
            reasons.append("workflow 2 requires artifactId=<uuid> in summary or tool output")
        if tool_stdout.strip():
            if TIER_BAD_RE.search(tool_stdout):
                reasons.append(
                    "publish returned partial/visual-only tier — fix customViz style checklist before ending",
                )
            elif not TIER_FULL_RE.search(tool_stdout):
                reasons.append(
                    "publish stdout missing styleComplianceTier=full — re-publish and pass tool_stdout to gate",
                )
            warn_match = WARNINGS_RE.search(tool_stdout)
            if warn_match:
                reasons.append(f"publish has {warn_match.group(1)} warning(s) — fix bundle before ending")
            for pat in DEPRECATED_STYLE_PATTERNS:
                if pat in tool_stdout or pat in agent_summary:
                    reasons.append(
                        f"deprecated style integration: {pat} — use host.vsCv.mount + p.style",
                    )
    elif wf == "3":
        reasons.extend(validate_workflow3_stdout(tool_stdout))
        reasons.extend(validate_workflow3_summary_semantics(agent_summary, tool_stdout))
        if not dashboard_id:
            reasons.append("workflow 3 requires dashboardId=<uuid> in summary or tool output")
        stdout_match = DASHBOARD_OK_RE.search(tool_stdout)
        if dashboard_id and stdout_match and dashboard_id.lower() != stdout_match.group(1).lower():
            reasons.append("dashboardId in summary does not match tool_stdout")
    elif wf == "1":
        if not VALIDATE_OK_RE.search(text):
            reasons.append("workflow 1 requires validate ok / preflight ok in output")
    else:
        reasons.append(f"unknown workflow: {workflow}")

    ok = len(reasons) == 0
    return GateResult(
        ok=ok,
        workflow=wf,
        reasons=reasons,
        artifact_id=artifact_id,
        dashboard_id=dashboard_id,
    )


def main(argv: list[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="DeepTalk completion gate")
    parser.add_argument("--workflow", required=True, choices=["1", "2", "3"])
    parser.add_argument("--agent-summary", required=True)
    parser.add_argument("--tool-stdout", default="")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)

    result = check_completion(args.workflow, args.agent_summary, args.tool_stdout)
    if args.json:
        print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
    elif result.ok:
        print("ok completion_gate passed")
        if result.artifact_id:
            print(f"artifactId={result.artifact_id}")
        if result.dashboard_id:
            print(f"dashboardId={result.dashboard_id}")
    else:
        for reason in result.reasons:
            print(f"gate blocked: {reason}", file=sys.stderr)
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
