#!/usr/bin/env python3
"""Export VS-AI-SPEC capability manifest from backend chart type registry."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "api" / "vs-ai-spec"
sys.path.insert(0, str(ROOT / "backend"))

from app.viz.registry import export_chart_type_catalog  # noqa: E402


def main() -> None:
    catalog = export_chart_type_catalog()
    manifest = {
        "version": 1,
        "widgetTypes": ["chart", "filter", "text", "media", "tabs", "customViz"],
        "chartTypes": catalog,
        "customVizProtocol": "docs/api/vs-ai-spec/PROTOCOL.md",
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / "capability-manifest.json"
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(catalog)} chart types to {path}")


if __name__ == "__main__":
    main()
