import { NAV_MANIFEST } from "@/config/nav-manifest";
import { matchesCapability, resolveUserCapabilities } from "@/lib/capabilities";
import type { NavSection, NavItem, NavSubItem } from "@/components/layout/app-sidebar";
import type { SessionUser, SessionRole } from "@/lib/session";

export const ACTIVE_MILESTONES = new Set(["M1", "M7", "M11"]);

export type ResolveNavOptions = {
  activeMilestones?: Set<string>;
  userCapabilities?: Set<string>;
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
  };
}

export function resolveNavGroups(
  user: SessionUser,
  options?: ResolveNavOptions,
): NavSection[] {
  const activeMilestones = options?.activeMilestones ?? ACTIVE_MILESTONES;
  const userCaps = options?.userCapabilities ?? resolveUserCapabilities(user.roles);
  const result: NavSection[] = [];

  for (const section of NAV_MANIFEST) {
    const sectionCap = section.capability;
    if (sectionCap) {
      if (!matchesCapability(userCaps, sectionCap)) continue;
    } else if (!hasRole(user, section.roles)) {
      continue;
    }

    const items: NavItem[] = [];
    for (const item of section.items) {
      const navItem = filterItemForRole(item, section, user, userCaps, activeMilestones);
      if (navItem) items.push(navItem);
    }
    if (items.length > 0) result.push({ title: section.title, items });
  }
  return result;
}
