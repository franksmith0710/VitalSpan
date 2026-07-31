/** 官方演示包 UI 辅助（对标 DataEase demo 源 / 示例仪表板） */

import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import type { DemoPackageLayoutMeta } from "@/components/dashboard/dashboardLayoutContracts";

export function isDemoPackageDatasource(code: string | undefined | null): boolean {
  return (code ?? "").toLowerCase() === "demo";
}

export function readDemoPackageMeta(layout: DashboardLayout | undefined): DemoPackageLayoutMeta | null {
  const meta = layout?.demoPackage;
  return meta?.seed ? meta : null;
}

export function isDemoPackageDashboard(input: {
  slug: string;
  layoutJson?: DashboardLayout;
}): boolean {
  if (input.slug.startsWith("demo-")) return true;
  return Boolean(readDemoPackageMeta(input.layoutJson)?.seed);
}
