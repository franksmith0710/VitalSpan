"""Actionable hints when customViz publish/preflight fails — keep in sync with plugin assets/aiviz-publish-hints.json."""

from __future__ import annotations

HINTS: dict[str, str] = {
    "AIVIZ_INVALID_MANIFEST": (
        "manifest 缺字段。复制 examples/scrolling-table.json 结构："
        "fieldSlots.dimensions + fieldSlots.metrics（min 均 >= 1）、styleSchema.properties（至少 1 项中文 title）"
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
    "AIVIZ_INLINE_D3_FORBIDDEN": "禁止内联 d3 整库；使用 host.vsCv.d3",
    "AIVIZ_WARN_MOUNT_RECOMMENDED": "html 也应 host.vsCv.mount(render)，否则 resize/样式可能不同步",
    "AIVIZ_WARN_STYLE_COMPLIANCE": (
        "render 内读 var st = (p && p.style) || {}；styleSchema 每项加中文 title"
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
    lines.append("  → 金样: examples/scrolling-table.json · guides/CUSTOM-VIZ-AUTHOR.md")
    return lines
