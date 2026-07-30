/** 分页列表页：main 区填满视口、禁止整页纵向滚动 */
const ADMIN_LIST_FILL_PATTERNS: RegExp[] = [
  /^\/admin\/dashboards\/?$/,
  /^\/admin\/data-screens\/?$/,
  /^\/admin\/viz-templates\/?$/,
  /^\/admin\/viz-components\/?$/,
  /^\/admin\/datasources\/?$/,
  /^\/admin\/datasets\/?$/,
  /^\/admin\/services\/?$/,
  /^\/admin\/governance\/catalog\/?$/,
  /^\/admin\/system\/audit\/?$/,
  /^\/admin\/system\/users\/?$/,
  /^\/admin\/system\/roles\/?$/,
  /^\/admin\/system\/rls\/?$/,
  /^\/admin\/system\/orgs\/?$/,
  /^\/admin\/system\/grants\/?$/,
  /^\/admin\/ingestion\/sync-jobs\/?$/,
];

const ADMIN_SCREEN_PREVIEW_PATTERN = /^\/admin\/data-screens\/[^/]+\/preview\/?$/;

const ADMIN_VIZ_COMPONENT_EDIT_PATTERN = /^\/admin\/viz-components\/[^/]+\/edit\/?$/;

/** 分享/嵌入配置页：全宽 fill（bi-share-embed） */
const ADMIN_SHARE_PATTERNS: RegExp[] = [
  /^\/admin\/dashboards\/[^/]+\/share\/?$/,
  /^\/admin\/data-screens\/[^/]+\/share\/?$/,
];

/**
 * 宽内容页：全宽但保留 main 纵向滚动（表格/主从/Hub/详情/设计器）。
 * 表单与账号页不在此列，仍用 max-w-2xl。
 */
const ADMIN_WIDE_SCROLL_PATTERNS: RegExp[] = [
  /^\/admin\/reports(?:\/|$)/,
  /^\/admin\/governance\/tickets\/?$/,
  /^\/admin\/governance\/publish\/?$/,
  /^\/admin\/designer\/?$/,
  /^\/admin\/metadata(?:\/|$)/,
  /^\/admin\/datasources\/(?!new$)[^/]+\/?$/,
  /^\/admin\/themes\/[^/]+\/?$/,
  /^\/admin\/entities\/overview\/?$/,
  /^\/admin\/ingestion\/sync-jobs\/[^/]+\/(?:history|etl-rules)\/?$/,
];

/** 看板/大屏编辑与查看（由 AdminLayout useMatch 判定，此处供测试与文档） */
const ADMIN_DASHBOARD_BUILDER_PATTERN =
  /^\/admin\/(?:dashboards|data-screens)\/[^/]+(?:\/edit)?\/?$/;

export function isAdminShareRoute(pathname: string): boolean {
  return ADMIN_SHARE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isAdminVizComponentEditRoute(pathname: string): boolean {
  return ADMIN_VIZ_COMPONENT_EDIT_PATTERN.test(pathname);
}

export function isAdminScreenPreviewRoute(pathname: string): boolean {
  return ADMIN_SCREEN_PREVIEW_PATTERN.test(pathname);
}

export function isAdminListFillRoute(pathname: string): boolean {
  return ADMIN_LIST_FILL_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function isAdminWideScrollRoute(pathname: string): boolean {
  return ADMIN_WIDE_SCROLL_PATTERNS.some((pattern) => pattern.test(pathname));
}

/** 是否匹配看板/大屏 builder（edit 或 view）路由 */
export function isAdminDashboardBuilderRoute(pathname: string): boolean {
  return ADMIN_DASHBOARD_BUILDER_PATTERN.test(pathname);
}

/** main 区应使用 max-w-none（全宽） */
export function isAdminMaxWidthNoneRoute(
  pathname: string,
  options?: { dashboardBuilder?: boolean },
): boolean {
  return (
    isAdminListFillRoute(pathname) ||
    isAdminShareRoute(pathname) ||
    isAdminVizComponentEditRoute(pathname) ||
    isAdminWideScrollRoute(pathname) ||
    options?.dashboardBuilder === true
  );
}

/** 仍使用 max-w-2xl 的表单/账号类路由（显式登记，便于审计） */
const ADMIN_CONSTRAINED_PATTERNS: RegExp[] = [
  /^\/admin\/account(?:\/|$)/,
  /^\/admin\/datasources\/new\/?$/,
  /^\/admin\/datasources\/[^/]+\/edit\/?$/,
  /^\/admin\/datasets\/new\/?$/,
  /^\/admin\/datasets\/[^/]+\/edit\/?$/,
  /^\/admin\/ingestion\/sync-jobs\/new\/?$/,
  /^\/admin\/ingestion\/sync-jobs\/[^/]+\/edit\/?$/,
];

export function isAdminConstrainedRoute(pathname: string): boolean {
  return ADMIN_CONSTRAINED_PATTERNS.some((pattern) => pattern.test(pathname));
}
