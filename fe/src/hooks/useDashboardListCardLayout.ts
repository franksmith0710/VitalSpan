import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";

type DashboardDetail = {
  layoutJson: DashboardLayout;
};

/** 列表卡片进入视口后拉取完整 layout，供真实图表预览（列表 API 仅含 previewSummary） */
export function useDashboardListCardLayout(
  dashboardId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["dashboard-list-preview", dashboardId],
    queryFn: () => apiFetch<DashboardDetail>(`/api/v1/dashboards/${dashboardId}`),
    enabled: Boolean(dashboardId && enabled),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.layoutJson,
  });
}
