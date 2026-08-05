/** Vite `base` / React Router basename helpers (export & embed path detection). */

export function getAppBasePath(): string {
  const raw = import.meta.env.BASE_URL ?? "/";
  if (raw === "/") return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

/** dev / 同源部署时 API 前缀；显式 `VITE_API_BASE_URL` 优先 */
export function resolveApiBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL;
  if (explicit) return explicit;
  if (import.meta.env.DEV) return getAppBasePath();
  return getAppBasePath() || "http://localhost:8000";
}

export function stripAppBase(pathname: string): string {
  const base = getAppBasePath();
  if (!base) return pathname;
  if (pathname === base) return "/";
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length);
  return pathname;
}

export function isExportSnapshotPath(pathname?: string): boolean {
  const path = stripAppBase(pathname ?? (typeof window !== "undefined" ? window.location.pathname : ""));
  return path.startsWith("/export/");
}

export function matchExportDashboardId(pathname?: string): string | null {
  const path = stripAppBase(pathname ?? (typeof window !== "undefined" ? window.location.pathname : ""));
  const match = path.match(/^\/export\/(?:dashboard|data-screen)\/([^/]+)/);
  return match?.[1] ?? null;
}
