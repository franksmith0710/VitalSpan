/** Vite `base` / React Router basename helpers (export & embed path detection). */

export function getAppBasePath(): string {
  const raw = import.meta.env.BASE_URL ?? "/";
  if (raw === "/") return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
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
