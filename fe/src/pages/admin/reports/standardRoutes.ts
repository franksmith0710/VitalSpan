/** Query key for standard analysis pack deep-link from Report Center Hub. */
export const STANDARD_PACK_QUERY = "pack";

export function standardAnalysisPath(packKey?: string): string {
  if (!packKey) return "/admin/reports/standard";
  const params = new URLSearchParams({ [STANDARD_PACK_QUERY]: packKey });
  return `/admin/reports/standard?${params.toString()}`;
}

export const THEME_LABELS: Record<string, string> = {
  lifecycle: "生命周期",
  distribution: "区域分布",
  activity: "活跃度",
  trend: "趋势",
};
