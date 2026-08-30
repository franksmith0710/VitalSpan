from __future__ import annotations

from urllib.parse import urlparse


def sanitize_redirect_after(redirect_after: str | None, *, default: str = "/admin/account/profile") -> str:
    if not redirect_after or not redirect_after.strip():
        return default
    candidate = redirect_after.strip()
    if candidate.startswith("/") and not candidate.startswith("//"):
        return candidate
    parsed = urlparse(candidate)
    if parsed.scheme in {"", "http", "https"} and parsed.netloc == "" and parsed.path.startswith("/"):
        return parsed.path + (f"?{parsed.query}" if parsed.query else "")
    return default
