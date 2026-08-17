import { Navigate, useSearchParams } from "react-router";
import { STANDARD_PACK_QUERY, STANDARD_PANEL_QUERY } from "./standardRoutes";

/** 旧书签 /admin/reports/standard/config → 合并后的标准分析页 */
export function StandardAnalysisConfigRedirect() {
  const [searchParams] = useSearchParams();
  const pack = searchParams.get(STANDARD_PACK_QUERY);
  const params = new URLSearchParams();
  params.set(STANDARD_PANEL_QUERY, "settings");
  if (pack) params.set(STANDARD_PACK_QUERY, pack);
  return <Navigate to={`/admin/reports/standard?${params.toString()}`} replace />;
}
