import type { DashboardLayout } from "@/components/dashboard/layoutUtils";

export type DashboardViewDocument = {
  name: string;
  protocolVersion: 1;
  dashboardId: string;
  layout: DashboardLayout;
};

/** Adapt dashboard PUT/GET payload to FR-VIEW-1 DashboardView document. */
export function dashboardLayoutToView(params: {
  dashboardId: string;
  name: string;
  layoutJson: DashboardLayout;
}): DashboardViewDocument {
  return {
    name: params.name,
    protocolVersion: 1,
    dashboardId: params.dashboardId,
    layout: params.layoutJson,
  };
}
