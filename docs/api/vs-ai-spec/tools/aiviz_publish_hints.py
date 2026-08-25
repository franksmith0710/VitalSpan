"""Actionable hints when customViz publish/preflight fails — keep in sync with plugin assets/aiviz-publish-hints.json."""

from __future__ import annotations

HINTS: dict[str, str] = {
    "AIVIZ_INVALID_MANIFEST": (
        "manifest 缺字段。先判范式 P1–P4，用 scaffold 复制对应金样；"
        "fieldSlots 须与范式一致（见 assets/custom-viz-paradigms.json）"
    ),
    "AIVIZ_UNSAFE_CONTENT": (
        "HTML 安全规则：禁止 <script src=、HTML 属性 onclick=/onmouseenter=、javascript:。"
        "悬停暂停用 CSS：.wrap.pause-hover:hover .track { animation-play-state: paused }；"
        "或 JS 用 addEventListener('mouseenter', fn)，勿写 .onmouseenter=function"
    ),
    "AIVIZ_FORBIDDEN_HOST_ID": (
        '禁止 id="app" 或 id="root"（与平台 SPA 冲突）。容器改用 id="vs-cv-*"'
    ),
    "AIVIZ_MOUNT_REQUIRED": (
        "d3 runtime 必须在 entry 脚本中调用 host.vsCv.mount(function (p) { ... })"
    ),
    "AIVIZ_MISSING_ENTRY": "files 必须包含 manifest.entry 指向的 HTML（通常 index.html）",
    "AIVIZ_INLINE_D3_FORBIDDEN": (
        "禁止内联 d3 整库（≥200KB 且含 d3.version）；runtime:d3 时用 host.vsCv.d3，勿 CDN/勿 paste 整库"
    ),
    "AIVIZ_FICTION_API": (
        "禁止 getStyle()、vs-cv-style-update、.vs-cv-style；样式只读 (p&&p.style)||{}，变化由 mount 回调重绘"
    ),
    "AIVIZ_WARN_MOUNT_RECOMMENDED": "html 也应 host.vsCv.mount(render)，否则 resize/样式可能不同步",
    "AIVIZ_WARN_STYLE_COMPLIANCE": (
        "render 内读 var st = (p && p.style) || {}；styleSchema 每项加中文 title"
    ),
    "AIVIZ_WARN_DETAIL_TABLE_METRICS": (
        "fieldSlots 与 P2 多维明细范式不符：dimensions.max>1 时须 metrics.min=0,max=0；"
        "换 scrolling-table 金样或改 manifest（与组件 id 无关）"
    ),
}


def hint_for(code: str, message: str = "") -> str | None:
    if code in HINTS:
        return HINTS[code]
    if "fieldSlots" in message and "min" in message:
        return HINTS["AIVIZ_INVALID_MANIFEST"]
    if "forbidden pattern" in message:
        return HINTS["AIVIZ_UNSAFE_CONTENT"]
    if 'id="app"' in message or 'id="root"' in message:
        return HINTS["AIVIZ_FORBIDDEN_HOST_ID"]
    return None


def format_error_block(code: str, message: str, http_status: int = 422) -> list[str]:
    lines = [f"[{http_status}] {code}: {message}"]
    hint = hint_for(code, message)
    if hint:
        lines.append(f"  → 修复: {hint}")
    lines.append("  → 金样: examples/html-minimal.json（默认）· guides/CUSTOM-VIZ-AUTHOR.md")
    return lines
