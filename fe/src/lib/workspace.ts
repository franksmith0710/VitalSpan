/** 用户工作台默认入口（消费态 Dashboard 列表） */
export const WORKSPACE_HOME_PATH = "/admin/dashboards";

export const ACCOUNT_PROFILE_PATH = "/admin/account/profile";
export const ACCOUNT_PREFERENCES_PATH = "/admin/account/preferences";
export const ACCOUNT_SECURITY_PATH = "/admin/account/security";
/** @deprecated 兼容旧链接，路由重定向至 preferences */
export const ACCOUNT_SETTINGS_PATH = "/admin/account/settings";

/** 个人中心入口（与 profile 同路径） */
export const ACCOUNT_CENTER_PATH = ACCOUNT_PROFILE_PATH;

/** 登录后离开工作台进入后台管理区时，用于恢复导航的快照 key */
export const WORKSPACE_RETURN_PATH_KEY = "workspace:returnPath";

/** 用户菜单内的账号管理页（仅从此处进入时展示「返回工作台」） */
export function isAccountManagementPath(pathname: string): boolean {
  return pathname.startsWith("/admin/account/");
}

/** 工作台路由：Dashboard 列表与查看态 */
export function isWorkspacePath(pathname: string): boolean {
  if (pathname === WORKSPACE_HOME_PATH) return true;
  if (/^\/admin\/dashboards\/[^/]+$/.test(pathname)) return true;
  return false;
}

/** 编辑态属于建设区，不算工作台 */
export function isWorkspaceViewPath(pathname: string): boolean {
  if (pathname === WORKSPACE_HOME_PATH) return true;
  return /^\/admin\/dashboards\/[^/]+$/.test(pathname) && !pathname.endsWith("/edit");
}

export function resolveWorkspaceReturnPath(
  path: string | null | undefined,
): string {
  if (path && isWorkspacePath(path)) return path;
  return WORKSPACE_HOME_PATH;
}
