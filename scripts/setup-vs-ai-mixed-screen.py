#!/usr/bin/env python3
"""按 VS-AI-SPEC 注册三个 customViz 组件并创建混排数据大屏。

用法（仓库根目录）:
  python scripts/setup-vs-ai-mixed-screen.py
  python scripts/setup-vs-ai-mixed-screen.py --api http://127.0.0.1:8000
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from pathlib import Path
from urllib import error, request

ROOT = Path(__file__).resolve().parents[1]
SPEC_EXAMPLES = ROOT / "docs" / "api" / "vs-ai-spec" / "examples"
BUNDLE_FILES = (
    "custom-viz-pulse-kpi.json",
    "custom-viz-alert-feed.json",
    "custom-viz-ring-progress.json",
)
SCREEN_NAME = "AI 混合可视化指挥大屏"


def _load_dotenv() -> None:
    env_path = ROOT / "backend" / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def _http_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    body: dict | None = None,
) -> tuple[int, dict | str]:
    data = None
    hdrs = dict(headers or {})
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs.setdefault("Content-Type", "application/json")
    req = request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8")
        try:
            return exc.code, json.loads(raw)
        except json.JSONDecodeError:
            return exc.code, raw


def login(api_base: str, username: str, password: str) -> str:
    status, payload = _http_json(
        "POST",
        f"{api_base}/api/v1/auth/login",
        body={"username": username, "password": password},
    )
    if status != 200 or not isinstance(payload, dict):
        raise RuntimeError(f"登录失败 ({status}): {payload}")
    token = payload.get("accessToken") or payload.get("access_token")
    if not token:
        raise RuntimeError(f"登录响应缺少 accessToken: {payload}")
    return str(token)


def register_artifact(api_base: str, token: str, bundle_path: Path) -> str:
    bundle = json.loads(bundle_path.read_text(encoding="utf-8"))
    status, payload = _http_json(
        "POST",
        f"{api_base}/api/v1/ai-viz/artifacts",
        headers={"Authorization": f"Bearer {token}"},
        body=bundle,
    )
    if status != 201 or not isinstance(payload, dict):
        raise RuntimeError(f"注册 {bundle_path.name} 失败 ({status}): {payload}")
    artifact_id = payload.get("artifactId")
    if not artifact_id:
        raise RuntimeError(f"注册响应缺少 artifactId: {payload}")
    return str(artifact_id)


def _chart_widget(
    widget_id: str,
    title: str,
    chart_type: str,
    x: int,
    y: int,
    width: int,
    height: int,
    order: int,
    *,
    de_style: dict | None = None,
) -> dict:
    native_body: dict = {"dataBinding": {"status": "manual"}}
    if de_style:
        native_body["deStyle"] = de_style
    return {
        "id": widget_id,
        "type": "chart",
        "title": title,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "order": order,
        "chartConfig": {
            "chartType": chart_type,
            "styleVariant": "default",
            "chartId": widget_id,
            "nativeBody": native_body,
        },
    }


def _custom_viz_widget(
    widget_id: str,
    title: str,
    artifact_id: str,
    x: int,
    y: int,
    width: int,
    height: int,
    order: int,
) -> dict:
    return {
        "id": widget_id,
        "type": "customViz",
        "title": title,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "order": order,
        "customVizConfig": {
            "artifactId": artifact_id,
            "dataBinding": {"status": "manual"},
        },
    }


def build_layout(artifact_ids: dict[str, str]) -> dict:
    w = lambda: str(uuid.uuid4())
    ids = {
        "title": w(),
        "pulse": w(),
        "bar": w(),
        "line": w(),
        "alert": w(),
        "ring": w(),
        "pie": w(),
        "gauge": w(),
    }
    return {
        "version": 2,
        "canvas": {"width": 1920, "height": 1080},
        "styleConfig": {
            "surfaceKind": "data-screen",
            "colorScheme": "dark",
        },
        "widgets": [
            {
                "id": ids["title"],
                "type": "text",
                "title": "标题",
                "x": 0,
                "y": 0,
                "width": 1920,
                "height": 88,
                "order": 0,
                "textConfig": {
                    "content": (
                        '<p style="text-align:center">'
                        '<span style="font-size:36px;color:#f2f4f7;font-weight:700">'
                        "AI 混合可视化指挥大屏"
                        "</span></p>"
                    ),
                    "variant": "html",
                },
            },
            _custom_viz_widget(
                ids["pulse"],
                "脉冲 KPI 指标带",
                artifact_ids["pulse-kpi"],
                24,
                100,
                1872,
                140,
                1,
            ),
            _chart_widget(
                ids["bar"],
                "区域销售对比",
                "bar",
                24,
                260,
                580,
                380,
                2,
                de_style={
                    "paletteColors": ["#38bdf8", "#818cf8", "#34d399"],
                    "cartesian": {"barRadius": 6},
                    "title": {"show": True, "color": "#f2f4f7"},
                },
            ),
            _chart_widget(
                ids["line"],
                "趋势走势",
                "line",
                620,
                260,
                680,
                380,
                3,
                de_style={
                    "paletteColors": ["#38bdf8"],
                    "cartesian": {"smooth": True},
                    "title": {"show": True, "color": "#f2f4f7"},
                },
            ),
            _custom_viz_widget(
                ids["alert"],
                "实时告警滚动",
                artifact_ids["alert-feed"],
                1316,
                260,
                580,
                380,
                4,
            ),
            _custom_viz_widget(
                ids["ring"],
                "任务完成率",
                artifact_ids["ring-progress"],
                24,
                664,
                580,
                380,
                5,
            ),
            _chart_widget(
                ids["pie"],
                "品类占比",
                "pie-donut",
                620,
                664,
                680,
                380,
                6,
                de_style={
                    "paletteColors": ["#38bdf8", "#818cf8", "#34d399", "#f59e0b"],
                    "title": {"show": True, "color": "#f2f4f7"},
                },
            ),
            _chart_widget(
                ids["gauge"],
                "综合达成率",
                "gauge",
                1316,
                664,
                580,
                380,
                7,
                de_style={
                    "paletteColors": ["#38bdf8"],
                    "title": {"show": True, "color": "#f2f4f7"},
                },
            ),
        ],
        "globalFilters": [],
    }


def create_and_save_screen(api_base: str, token: str, layout: dict) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    status, created = _http_json(
        "POST",
        f"{api_base}/api/v1/dashboards",
        headers=headers,
        body={"name": SCREEN_NAME, "description": "VS-AI-SPEC 混排：3 个 customViz + 4 个内置图"},
    )
    dashboard_id: str | None = None
    if status == 201 and isinstance(created, dict):
        dashboard_id = created.get("id")
    elif status == 409:
        status, listed = _http_json(
            "GET",
            f"{api_base}/api/v1/dashboards?surfaceKind=data-screen&limit=50",
            headers=headers,
        )
        if status == 200 and isinstance(listed, dict):
            for item in listed.get("items", []):
                if item.get("name") == SCREEN_NAME:
                    dashboard_id = item.get("id")
                    break
    if not dashboard_id:
        raise RuntimeError(f"创建大屏失败 ({status}): {created}")

    status, saved = _http_json(
        "PUT",
        f"{api_base}/api/v1/dashboards/{dashboard_id}/editor-save",
        headers=headers,
        body={"name": SCREEN_NAME, "layoutJson": layout, "globalFilters": None},
    )
    if status != 200 or not isinstance(saved, dict):
        raise RuntimeError(f"editor-save 失败 ({status}): {saved}")
    return saved.get("dashboard") or {"id": dashboard_id}


def main() -> int:
    parser = argparse.ArgumentParser(description="注册 VS-AI customViz 并创建混排数据大屏")
    parser.add_argument("--api", default="http://127.0.0.1:8000", help="API 基址")
    parser.add_argument("--username", default="admin")
    parser.add_argument("--password", default=None, help="默认读 VITALSPAN_DEV_ADMIN_PASSWORD")
    args = parser.parse_args()

    _load_dotenv()
    password = args.password or os.environ.get("VITALSPAN_DEV_ADMIN_PASSWORD")
    if not password:
        print("错误: 请设置 VITALSPAN_DEV_ADMIN_PASSWORD 或传入 --password", file=sys.stderr)
        return 1

    api_base = args.api.rstrip("/")
    print(f"登录 {api_base} …")
    token = login(api_base, args.username, password)

    artifact_ids: dict[str, str] = {}
    key_map = {
        "custom-viz-pulse-kpi.json": "pulse-kpi",
        "custom-viz-alert-feed.json": "alert-feed",
        "custom-viz-ring-progress.json": "ring-progress",
    }
    for filename in BUNDLE_FILES:
        path = SPEC_EXAMPLES / filename
        if not path.is_file():
            print(f"错误: 找不到 {path}", file=sys.stderr)
            return 1
        print(f"注册组件 {filename} …")
        artifact_ids[key_map[filename]] = register_artifact(api_base, token, path)
        print(f"  → artifactId: {artifact_ids[key_map[filename]]}")

    layout = build_layout(artifact_ids)
    layout_path = SPEC_EXAMPLES / "ai-mixed-command-screen.json"
    layout_path.write_text(
        json.dumps(
            {
                "description": "混排指挥大屏：3 customViz + 4 内置图（artifactId 为示例运行产出）",
                "artifactIds": artifact_ids,
                "layoutJson": layout,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"布局已写入 {layout_path.relative_to(ROOT)}")

    print("创建数据大屏 …")
    dashboard = create_and_save_screen(api_base, token, layout)
    dash_id = dashboard.get("id")
    print()
    print("[OK] 完成")
    print(f"  大屏名称: {SCREEN_NAME}")
    print(f"  大屏 ID:   {dash_id}")
    print(f"  编辑地址:  http://localhost:5173/admin/data-screens/{dash_id}/edit")
    print(f"  预览地址:  http://localhost:5173/admin/data-screens/{dash_id}/preview")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
