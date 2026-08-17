/** Query key for standard analysis pack deep-link from Report Center Hub. */
export const STANDARD_PACK_QUERY = "pack";
export const STANDARD_PANEL_QUERY = "panel";

export function standardAnalysisPath(packKey?: string, panel: "view" | "settings" = "view"): string {
  const params = new URLSearchParams();
  if (packKey) params.set(STANDARD_PACK_QUERY, packKey);
  if (panel === "settings") params.set(STANDARD_PANEL_QUERY, "settings");
  const query = params.toString();
  return query ? `/admin/reports/standard?${query}` : "/admin/reports/standard";
}

export function standardAnalysisConfigPath(packKey?: string): string {
  return standardAnalysisPath(packKey, "settings");
}

export const THEME_LABELS: Record<string, string> = {
  lifecycle: "生命周期",
  distribution: "区域分布",
  activity: "活跃度",
  trend: "趋势",
};
