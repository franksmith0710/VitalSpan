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
