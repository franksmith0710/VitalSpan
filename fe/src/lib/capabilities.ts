import type { SessionRole, SessionUser } from "@/lib/session";

const BUILTIN_ROLE_CAPABILITIES: Record<SessionRole, readonly string[]> = {
  admin: [
    "system:*",
    "datasource:*",
    "dashboard:read",
    "dashboard:edit",
    "report:*",
    "governance:*",
    "theme:*",
    "metadata:*",
    "dataset:*",
  ],
  /** analyst 仅消费报表；模板/调度需 report:manage（admin 的 report:* 覆盖） */
  analyst: ["dashboard:edit", "report:read", "theme:*"],
  viewer: ["dashboard:read", "report:read"],
};

/** 测试或二期可注入自定义 role → capability 映射 */
export const OPTIONAL_ROLE_CAPABILITY_MAP: Record<string, readonly string[]> = {};

export function resolveUserCapabilities(roles: string[]): Set<string> {
  const caps = new Set<string>();
  for (const role of roles) {
    const builtin = BUILTIN_ROLE_CAPABILITIES[role as SessionRole];
    if (builtin) {
      builtin.forEach((c) => caps.add(c));
      continue;
    }
    const custom = OPTIONAL_ROLE_CAPABILITY_MAP[role];
    if (custom) custom.forEach((c) => caps.add(c));
  }
  return caps;
}

export function matchesCapability(userCaps: Set<string>, required: string): boolean {
  if (userCaps.has(required)) return true;
  const colon = required.indexOf(":");
  if (colon === -1) return false;
  const prefix = required.slice(0, colon);
  if (userCaps.has(`${prefix}:*`)) return true;
  if (!required.endsWith(":*")) return false;
  for (const cap of userCaps) {
    if (cap === required) return true;
    if (cap.startsWith(`${prefix}:`)) return true;
  }
  return false;
}

export function hasCapability(user: SessionUser, required: string): boolean {
  return matchesCapability(resolveUserCapabilities(user.roles), required);
}
