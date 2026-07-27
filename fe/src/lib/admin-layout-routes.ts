/** 分页列表页：main 区填满视口、禁止整页纵向滚动 */
const ADMIN_LIST_FILL_PATTERNS: RegExp[] = [
  /^\/admin\/dashboards\/?$/,
  /^\/admin\/data-screens\/?$/,
  /^\/admin\/datasources\/?$/,
  /^\/admin\/datasets\/?$/,
  /^\/admin\/services\/?$/,
  /^\/admin\/governance\/catalog\/?$/,
  /^\/admin\/system\/audit\/?$/,
  /^\/admin\/system\/users\/?$/,
  /^\/admin\/system\/roles\/?$/,
  /^\/admin\/ingestion\/sync-jobs\/?$/,
];

const ADMIN_SCREEN_PREVIEW_PATTERN = /^\/admin\/data-screens\/[^/]+\/preview\/?$/;

const ADMIN_VIZ_COMPONENT_EDIT_PATTERN = /^\/admin\/viz-components\/[^/]+\/edit\/?$/;

export function isAdminVizComponentEditRoute(pathname: string): boolean {
  return ADMIN_VIZ_COMPONENT_EDIT_PATTERN.test(pathname);
}

export function isAdminScreenPreviewRoute(pathname: string): boolean {
  return ADMIN_SCREEN_PREVIEW_PATTERN.test(pathname);
}

export function isAdminListFillRoute(pathname: string): boolean {
  return ADMIN_LIST_FILL_PATTERNS.some((pattern) => pattern.test(pathname));
}
