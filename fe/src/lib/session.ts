/**
 * Session role helpers. User identity comes from AuthProvider / GET /api/v1/me.
 */
import { hasCapability } from "@/lib/capabilities";

export type SessionRole = "admin" | "analyst" | "viewer";

export type SessionUser = {
  name: string;
  email: string;
  roles: SessionRole[];
  permissions?: string[];
  isRoot?: boolean;
};

export function sessionUserFromAuth(
  username: string,
  roles: SessionRole[],
  profile?: { displayName?: string; email?: string },
): SessionUser {
  return {
    name: profile?.displayName?.trim() || username,
    email: profile?.email?.trim() || `${username}@vitalspan.local`,
    roles,
  };
}

export function sessionUserFromMe(user: {
  username: string;
  displayName?: string;
  email?: string;
  roles: SessionRole[];
  permissions?: string[];
  isRoot?: boolean;
}): SessionUser {
  return {
    ...sessionUserFromAuth(user.username, user.roles, {
      displayName: user.displayName,
      email: user.email,
    }),
    permissions: user.permissions,
    isRoot: user.isRoot,
  };
}

export function canManagePlatform(user: SessionUser): boolean {
  return hasCapability(user, "system:*");
}

export function canEditDashboards(user: SessionUser): boolean {
  return hasCapability(user, "dashboard:edit");
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
