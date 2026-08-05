/** Vite `base` / React Router basename helpers (export & embed path detection). */

function normalizeBasePath(raw: string): string {
  if (raw === "/") return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function getAppBasePath(): string {
  return normalizeBasePath(import.meta.env.BASE_URL ?? "/");
}

/** dev / 同源部署时 API 前缀；显式 `VITE_API_BASE_URL` 优先（含空串表示同源相对路径） */
export function resolveApiBaseUrl(): string {
  const env = import.meta.env as ImportMetaEnv & { VITE_API_BASE_URL?: string };
  if (env.VITE_API_BASE_URL !== undefined) {
    return env.VITE_API_BASE_URL;
  }
  if (import.meta.env.DEV) return getAppBasePath();
  return getAppBasePath();
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
