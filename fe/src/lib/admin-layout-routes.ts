/** 分页列表页：main 区填满视口、禁止整页纵向滚动 */
const ADMIN_LIST_FILL_PATTERNS: RegExp[] = [
  /^\/admin\/dashboards\/?$/,
  /^\/admin\/datasources\/?$/,
  /^\/admin\/datasets\/?$/,
  /^\/admin\/services\/?$/,
  /^\/admin\/governance\/catalog\/?$/,
  /^\/admin\/system\/audit\/?$/,
  /^\/admin\/system\/users\/?$/,
  /^\/admin\/system\/roles\/?$/,
  /^\/admin\/ingestion\/sync-jobs\/?$/,
];

export function isAdminListFillRoute(pathname: string): boolean {
  return ADMIN_LIST_FILL_PATTERNS.some((pattern) => pattern.test(pathname));
}
