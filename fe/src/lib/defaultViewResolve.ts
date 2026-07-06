import { apiFetch } from "@/lib/api";

type DefaultViews = {
  dashboardId: string | null;
  inheritFromRoleId?: string | null;
};

const MAX_INHERIT_DEPTH = 8;

async function fetchRoleDefaults(roleKey: string): Promise<DefaultViews | null> {
  try {
    return await apiFetch<DefaultViews>(`/api/v1/roles/${encodeURIComponent(roleKey)}/default-views`);
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "VIEW_DEFAULT_FORBIDDEN" || code === "ROLE_NOT_FOUND") return null;
    console.warn("defaultViewResolve: fetch failed", roleKey, err);
    return null;
  }
}

async function resolveInherited(
  roleKey: string,
  depth: number,
  visited: Set<string>,
): Promise<string | null> {
  if (depth > MAX_INHERIT_DEPTH || visited.has(roleKey)) return null;
  visited.add(roleKey);
  const data = await fetchRoleDefaults(roleKey);
  if (!data) return null;
  if (data.dashboardId) return `/admin/dashboards/${data.dashboardId}`;
  if (data.inheritFromRoleId) {
    return resolveInherited(data.inheritFromRoleId, depth + 1, visited);
  }
  return null;
}

export async function resolveDefaultDashboardPath(roleCodes: string[]): Promise<string | null> {
  for (const code of roleCodes) {
    const path = await resolveInherited(code, 0, new Set());
    if (path) return path;
  }
  return null;
}
