import type { DashboardLayout, DashboardLayoutV2 } from "@/components/dashboard/layoutUtils";
import {
  buildDefaultLayoutForSurface,
  type SurfaceKind,
} from "@/lib/surfacePreset";

export type DashboardSurfaceKind = SurfaceKind;

export const DATA_SCREEN_CANVAS = {
  width: 1920,
  height: 1080,
} as const;

export function readSurfaceKind(
  layout?: Pick<DashboardLayout, "styleConfig"> | null,
): DashboardSurfaceKind {
  const kind = layout?.styleConfig?.surfaceKind;
  return kind === "data-screen" ? "data-screen" : "dashboard";
}

export function isDataScreenLayout(
  layout?: Pick<DashboardLayout, "styleConfig"> | null,
): boolean {
  return readSurfaceKind(layout) === "data-screen";
}

export function buildDefaultDataScreenLayout(): DashboardLayoutV2 {
  return buildDefaultLayoutForSurface("data-screen");
}

export function dataScreenListPath(): string {
  return "/admin/data-screens";
}

export function dataScreenEditPath(id: string): string {
  return `/admin/data-screens/${id}/edit`;
}

export function dataScreenViewPath(id: string): string {
  return `/admin/data-screens/${id}`;
}

export function dataScreenPreviewPath(id: string): string {
  return `/admin/data-screens/${id}/preview`;
}

export function isDataScreenAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin/data-screens");
}

export function isDataScreenPreviewPath(pathname: string): boolean {
  return /^\/admin\/data-screens\/[^/]+\/preview\/?$/.test(pathname);
}

export function dashboardSharePath(id: string, isScreen: boolean): string {
  return isScreen ? `/admin/data-screens/${id}/share` : `/admin/dashboards/${id}/share`;
}

export function ensureDataScreenStyleConfig<T extends { surfaceKind?: DashboardSurfaceKind }>(
  style: T,
  isScreen: boolean,
): T {
  if (!isScreen) return style;
  return { ...style, surfaceKind: "data-screen" };
}
