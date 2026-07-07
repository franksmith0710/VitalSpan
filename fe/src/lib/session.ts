/**
 * Session role helpers. User identity comes from AuthProvider / GET /api/v1/me.
 */
export type SessionRole = "admin" | "analyst" | "viewer";

export type SessionUser = {
  name: string;
  email: string;
  roles: SessionRole[];
};

export function sessionUserFromAuth(username: string, roles: SessionRole[]): SessionUser {
  return {
    name: username,
    email: `${username}@vitalspan.local`,
    roles,
  };
}

export function canManagePlatform(user: SessionUser): boolean {
  return user.roles.includes("admin");
}

export function canEditDashboards(user: SessionUser): boolean {
  return user.roles.includes("admin") || user.roles.includes("analyst");
}

const ROLE_LABELS: Record<SessionRole, string> = {
  admin: "管理员",
  analyst: "分析师",
  viewer: "查看者",
};

export function primaryRoleLabel(roles: SessionRole[]): string {
  if (roles.includes("admin")) return ROLE_LABELS.admin;
  if (roles.includes("analyst")) return ROLE_LABELS.analyst;
  return ROLE_LABELS.viewer;
}
