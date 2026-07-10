import { NAV_MANIFEST } from "@/config/nav-manifest";
import { ACCOUNT_NAV_SECTIONS } from "@/config/account-nav";
import { matchesCapability, resolveUserCapabilities } from "@/lib/capabilities";
import { isGovNavEnabledFromEnv } from "@/lib/gov-nav";
import { isAccountManagementPath } from "@/lib/workspace";
import type { NavSection, NavItem, NavSubItem } from "@/components/layout/app-sidebar";
import type { SessionUser, SessionRole } from "@/lib/session";

export const ACTIVE_MILESTONES = new Set(["M1", "M7", "M11", "M13"]);

export type ResolveNavOptions = {
  activeMilestones?: Set<string>;
  userCapabilities?: Set<string>;
  /** H1 覆盖：测试或运行时显式开关；默认读 `VITE_GOV_NAV` */
  govNavEnabled?: boolean;
};

function isAdmin(user: SessionUser): boolean {
  return user.roles.includes("admin");
}

function hasRole(user: SessionUser, roles: SessionRole[]): boolean {
  return user.roles.some((r) => roles.includes(r));
}

type ManifestItem = (typeof NAV_MANIFEST)[0]["items"][0];
type ManifestSection = (typeof NAV_MANIFEST)[0];

function filterSubItem(
  sub: NonNullable<ManifestItem["subItems"]>[0],
  sectionCap: string | undefined,
  userCaps: Set<string>,
  activeMilestones: Set<string>,
  user: SessionUser,
): NavSubItem | null {
  const requiredCap = sub.capability ?? sectionCap;
  if (requiredCap && !matchesCapability(userCaps, requiredCap)) return null;
  if (sub.milestone && !activeMilestones.has(sub.milestone) && !isAdmin(user)) return null;
  return { name: sub.name, path: sub.path };
}

function filterItemForRole(
  item: ManifestItem,
  section: ManifestSection,
  user: SessionUser,
  userCaps: Set<string>,
  activeMilestones: Set<string>,
): NavItem | null {
  if (!isAdmin(user) && item.iaPriority === "advanced") return null;

  const sectionCap = section.capability;
  const requiredCap = item.capability ?? sectionCap;

  if (requiredCap) {
    if (!matchesCapability(userCaps, requiredCap)) return null;
  } else {
    const effectiveRoles = (item.roles as SessionRole[] | undefined) ?? section.roles;
    if (!hasRole(user, effectiveRoles)) return null;
  }

  const isInactive = Boolean(item.milestone && !activeMilestones.has(item.milestone));
  if (isInactive && !isAdmin(user)) return null;
  const addPreview = isInactive && isAdmin(user);

  let filteredSubItems: NavSubItem[] | undefined;
  if (item.subItems) {
    filteredSubItems = item.subItems
      .map((sub) => filterSubItem(sub, requiredCap ?? sectionCap, userCaps, activeMilestones, user))
      .filter((s): s is NavSubItem => s !== null);
    if (filteredSubItems.length === 0) return null;
  }

  return {
    name: item.name,
    icon: item.icon,
    ...(item.path ? { path: item.path } : {}),
    ...(addPreview ? { preview: true } : {}),
    ...(filteredSubItems ? { subItems: filteredSubItems } : {}),
    ...(item.badgeLabel ? { badgeLabel: item.badgeLabel } : {}),
  };
}

export function resolveNavGroups(
  user: SessionUser,
  options?: ResolveNavOptions,
): NavSection[] {
  const activeMilestones = options?.activeMilestones ?? ACTIVE_MILESTONES;
  const userCaps = options?.userCapabilities ?? resolveUserCapabilities(user.roles);
  const govNavEnabled = options?.govNavEnabled ?? isGovNavEnabledFromEnv();
  const result: NavSection[] = [];

  for (const section of NAV_MANIFEST) {
    if (section.requiresGovNav && !govNavEnabled) continue;

    const sectionCap = section.capability;
    if (sectionCap) {
      if (!matchesCapability(userCaps, sectionCap)) continue;
    } else if (!hasRole(user, section.roles)) {
      continue;
    }

    if (!isAdmin(user) && section.iaTier === "engineering") continue;

    const items: NavItem[] = [];
    for (const item of section.items) {
      const navItem = filterItemForRole(item, section, user, userCaps, activeMilestones);
      if (navItem) items.push(navItem);
    }
    if (items.length > 0) {
      result.push({
        title: section.title,
        items,
        ...(section.defaultCollapsed ? { defaultCollapsed: true } : {}),
      });
    }
  }
  return result;
}

export function resolveSidebarSections(
  user: SessionUser,
  pathname: string,
  options?: ResolveNavOptions,
): NavSection[] {
  if (isAccountManagementPath(pathname)) {
    return ACCOUNT_NAV_SECTIONS;
  }
  return resolveNavGroups(user, options);
}
