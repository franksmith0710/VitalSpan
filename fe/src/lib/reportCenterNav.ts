import { standardAnalysisPath } from "@/pages/admin/reports/standardRoutes";
import { resolveActiveNavPath } from "@/lib/nav-active";

export const REPORT_CENTER_SUB_NAV_PATHS = [
  "/admin/reports/center",
  "/admin/reports/standard",
  "/admin/reports/templates",
  "/admin/reports/schedules",
] as const;

/** 侧栏报表子项高亮：模板查看页归入「文档模板」 */
export function resolveReportCenterSubNavPath(pathname: string): string | null {
  if (pathname.startsWith("/admin/reports/view")) {
    return "/admin/reports/templates";
  }
  return resolveActiveNavPath(pathname, [...REPORT_CENTER_SUB_NAV_PATHS]);
}

export function isReportCenterNavGroup(subItems: { path: string }[] | undefined): boolean {
  return Boolean(subItems?.some((sub) => sub.path.startsWith("/admin/reports")));
}

export const DOC_TEMPLATE_SCHEDULE_HINT =
  "打开文档模板 → 右侧「调度」Tab 配置定时生成与投递。";

export const DOC_TEMPLATE_PRODUCT_LINE =
  "固定版式文档（Word/Excel/PDF 套版填数），支持扩展配置、版本发布与定时投递。";

export const VISUAL_SCHEDULE_PRODUCT_LINE =
  "看板/大屏编辑页「定时推送」，生成可视化 PDF 定时报告（推荐主路径）。";

export const VIZ_VS_DOC_TEMPLATE_HINT =
  "看板/大屏组件模板在侧栏「可视化模板」；本页为文档套版（Word/Excel/PDF 填数导出）。";

export function canRetryReportSchedules(caps: Iterable<string> | Set<string>): boolean {
  const set = caps instanceof Set ? caps : new Set(caps);
  const has = (required: string) => {
    if (set.has("*") || set.has(required)) return true;
    const prefix = required.split(":")[0];
    return set.has(`${prefix}:*`) || set.has(`${prefix}:manage`);
  };
  return has("report:manage") || has("dashboard:schedule");
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  template: "文档模板",
  standard: "标准分析",
  schedule: "定时报告",
  dashboard: "看板",
};

export function localizeCenterResourceType(resourceType: string): string {
  return RESOURCE_TYPE_LABELS[resourceType] ?? resourceType;
}

export function resolveCenterRecentHref(item: {
  resourceType: string;
  resourceId: string;
}): string {
  switch (item.resourceType) {
    case "template":
      return `/admin/reports/view/${item.resourceId}`;
    case "standard":
      return standardAnalysisPath(item.resourceId);
    case "schedule":
      return `/admin/reports/schedules?tab=all&expand=${encodeURIComponent(item.resourceId)}`;
    default:
      return "/admin/reports/center";
  }
}
