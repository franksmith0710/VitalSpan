import type { DashboardSurfaceKind } from "@/lib/dataScreenLayout";

export type DashboardsListParams = {
  limit: number;
  offset: number;
  surfaceKind?: DashboardSurfaceKind;
};

export function buildDashboardsListUrl({
  limit,
  offset,
  surfaceKind,
}: DashboardsListParams): string {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (surfaceKind) {
    params.set("surfaceKind", surfaceKind);
  }
  return `/api/v1/dashboards?${params.toString()}`;
}
