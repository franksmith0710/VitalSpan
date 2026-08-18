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
