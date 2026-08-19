from app.ai_viz.errors import AiVizError
from app.ai_viz.models import (
    INLINE_D3_MIN_BYTES,
    MAX_BUNDLE_BYTES,
    validate_bundle_files,
    validate_manifest,
)

_MIN_MANIFEST = {
    "fieldSlots": {"dimensions": {"min": 1}, "metrics": {"min": 1}},
    "styleSchema": {"properties": {"accentColor": {"type": "string"}}},
}


def test_validate_manifest_accepts_html_and_d3_runtime() -> None:
    validate_manifest({**_MIN_MANIFEST, "runtime": "html"})
    validate_manifest({**_MIN_MANIFEST, "runtime": "d3"})
    validate_manifest({**_MIN_MANIFEST, "rendererHint": "d3"})


def test_validate_manifest_rejects_unknown_runtime() -> None:
    try:
        validate_manifest({**_MIN_MANIFEST, "runtime": "echarts"})
    except AiVizError as exc:
        assert exc.code == "AIVIZ_INVALID_MANIFEST"
        return
    raise AssertionError("expected AIVIZ_INVALID_MANIFEST")


def test_bundle_rejects_inline_d3_library() -> None:
    blob = ("x" * INLINE_D3_MIN_BYTES) + "d3.version"
    try:
        validate_bundle_files({"index.html": blob}, "index.html")
    except AiVizError as exc:
        assert exc.code == "AIVIZ_INLINE_D3_FORBIDDEN"
        return
    raise AssertionError("expected AIVIZ_INLINE_D3_FORBIDDEN")


def test_bundle_rejects_d3_without_mount() -> None:
    html = "<!DOCTYPE html><html><body><script>host.vsCv.onPayload(function(){});</script></body></html>"
    manifest = {**_MIN_MANIFEST, "runtime": "d3"}
    try:
        validate_bundle_files({"index.html": html}, "index.html", manifest)
    except AiVizError as exc:
        assert exc.code == "AIVIZ_MOUNT_REQUIRED"
        return
    raise AssertionError("expected AIVIZ_MOUNT_REQUIRED")


def test_bundle_accepts_d3_with_mount() -> None:
    html = "<!DOCTYPE html><html><body><script>host.vsCv.mount(function(){});</script></body></html>"
    manifest = {**_MIN_MANIFEST, "runtime": "d3"}
    validate_bundle_files({"index.html": html}, "index.html", manifest)


def test_bundle_rejects_forbidden_root_id() -> None:
    html = '<!DOCTYPE html><html><body><div id="root"></div></body></html>'
    try:
        validate_bundle_files({"index.html": html}, "index.html", _MIN_MANIFEST)
    except AiVizError as exc:
        assert exc.code == "AIVIZ_FORBIDDEN_HOST_ID"
        return
    raise AssertionError("expected AIVIZ_FORBIDDEN_HOST_ID")


def test_official_d3_example_passes_mount_lint() -> None:
    import json
    from pathlib import Path

    root = Path(__file__).resolve().parents[2]
    doc = json.loads((root / "docs/api/vs-ai-spec/examples/custom-viz-d3-bundle.json").read_text(encoding="utf-8"))
    html = doc["files"]["index.html"]
    manifest = doc["manifest"]
    validate_bundle_files({"index.html": html}, "index.html", manifest)


def test_bundle_size_limit_is_2mb() -> None:
    assert MAX_BUNDLE_BYTES == 2 * 1024 * 1024
    modest = "a" * 1024
    validate_bundle_files({"index.html": modest}, "index.html")
    validate_bundle_files({"index.html": "a" * MAX_BUNDLE_BYTES}, "index.html")
    try:
        validate_bundle_files({"index.html": "a" * (MAX_BUNDLE_BYTES + 1)}, "index.html")
    except AiVizError as exc:
        assert exc.code == "AIVIZ_BUNDLE_TOO_LARGE"
        assert exc.status == 413
        return
    raise AssertionError("expected AIVIZ_BUNDLE_TOO_LARGE")
