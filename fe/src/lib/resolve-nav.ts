import { NAV_MANIFEST } from "@/config/nav-manifest";
import type {
  NavSection,
  NavItem,
  NavSubItem,
} from "@/components/layout/app-sidebar";
import type { SessionUser, SessionRole } from "@/lib/session";

export const ACTIVE_MILESTONES = new Set(["M1", "M7", "M11"]);

function isAdmin(user: SessionUser): boolean {
  return user.roles.includes("admin");
}

function hasRole(user: SessionUser, roles: SessionRole[]): boolean {
  return user.roles.some((r) => roles.includes(r));
}

type ManifestItem = (typeof NAV_MANIFEST)[0]["items"][0];

function filterItemForRole(
  item: ManifestItem,
  sectionRoles: SessionRole[],
  user: SessionUser,
  capabilities: Set<string>,
): NavItem | null {
  const effectiveRoles = (item.roles as SessionRole[] | undefined) ?? sectionRoles;
  if (!hasRole(user, effectiveRoles)) return null;

  const isInactive = Boolean(item.milestone && !capabilities.has(item.milestone));
  if (isInactive && !isAdmin(user)) return null;
  const addPreview = isInactive && isAdmin(user);

  let filteredSubItems: NavSubItem[] | undefined;
  if (item.subItems) {
    filteredSubItems = item.subItems
      .filter(
        (sub) =>
          !sub.milestone || capabilities.has(sub.milestone) || isAdmin(user),
      )
      .map((sub) => ({ name: sub.name, path: sub.path }));
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

/**
 * 从 NAV_MANIFEST 派生侧栏 NavSection[]。
 * @param user         当前会话用户（含角色）
 * @param capabilities 覆盖里程碑集合（测试 / F-B ability 扩展用），默认 ACTIVE_MILESTONES
 */
export function resolveNavGroups(
  user: SessionUser,
  capabilities: Set<string> = ACTIVE_MILESTONES,
): NavSection[] {
  const result: NavSection[] = [];

  for (const section of NAV_MANIFEST) {
    if (!hasRole(user, section.roles)) continue;

    const items: NavItem[] = [];
    for (const item of section.items) {
      const navItem = filterItemForRole(
        item,
        section.roles,
        user,
        capabilities,
      );
      if (navItem) items.push(navItem);
    }

    if (items.length > 0) {
      result.push({ title: section.title, items });
    }
  }

  return result;
}
