/**
 * M1 登录态占位。联调 GET /api/v1/me 后改为读服务端 roles。
 * 角色在登录时确定，顶栏不提供切换。
 */
export type SessionRole = "admin" | "analyst" | "viewer";

export type SessionUser = {
  name: string;
  email: string;
  roles: SessionRole[];
};

const M1_SESSION: SessionUser = {
  name: "管理员",
  email: "admin@vitalspan.local",
  roles: ["admin"],
};

export function getSessionUser(): SessionUser {
  return M1_SESSION;
}

export function canManagePlatform(user: SessionUser = getSessionUser()): boolean {
  return user.roles.includes("admin");
}

export function canEditDashboards(user: SessionUser = getSessionUser()): boolean {
  return user.roles.includes("admin") || user.roles.includes("analyst");
}
