import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";
import { ANALYST_NAV_GROUPS } from "@/config/analyst-nav";
import { USER_NAV_GROUPS } from "@/config/user-nav";
import type { NavSection } from "@/components/layout/app-sidebar";
import {
  canEditDashboards,
  canManagePlatform,
  type SessionUser,
} from "@/lib/session";

export function resolveNavGroups(user: SessionUser): NavSection[] {
  if (canManagePlatform(user)) return ADMIN_NAV_GROUPS;
  if (canEditDashboards(user)) return ANALYST_NAV_GROUPS;
  return USER_NAV_GROUPS;
}
