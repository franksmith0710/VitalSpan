/** 管理端侧栏高频路由 → 动态 import 预拉（hover 触发） */
export const ADMIN_ROUTE_PREFETCH: Record<string, () => Promise<unknown>> = {
  "/admin/dashboards": () => import("@/pages/admin/dashboard/DashboardListPage"),
  "/admin/data-screens": () => import("@/pages/admin/data-screens/DataScreenListPage"),
  "/admin/datasets": () => import("@/pages/admin/datasets/DatasetListPage"),
  "/admin/viz-templates": () => import("@/pages/admin/viz-templates/VizTemplatesHubPage"),
  "/admin/viz-components": () => import("@/pages/admin/viz-components/VizComponentsHubPage"),
  "/admin/reports/center": () => import("@/pages/admin/reports/ReportCenterPage"),
  "/admin/datasources": () => import("@/pages/admin/datasources/DatasourceListPage"),
};

const prefetched = new Set<string>();

export function prefetchAdminRoute(path: string | undefined): void {
  if (!path) return;
  const loader = ADMIN_ROUTE_PREFETCH[path];
  if (!loader || prefetched.has(path)) return;
  prefetched.add(path);
  void loader().catch(() => {
    prefetched.delete(path);
  });
}

export function resetRoutePrefetchForTests(): void {
  prefetched.clear();
}
