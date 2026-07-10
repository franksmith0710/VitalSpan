import * as React from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown } from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/context/sidebar-context";

export type NavSubItem = {
  name: string;
  path: string;
  new?: boolean;
  pro?: boolean;
  target?: string;
};

export type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  new?: boolean;
  preview?: boolean;
  target?: string;
  subItems?: NavSubItem[];
  badgeLabel?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
  /** 侧栏分组默认折叠（工程/系统） */
  defaultCollapsed?: boolean;
};

export type AppSidebarProps = {
  sections: NavSection[];
  logo?: React.ReactNode;
  collapsedLogo?: React.ReactNode;
  widget?: React.ReactNode;
  leading?: React.ReactNode;
  navAriaLabel?: string;
  className?: string;
};

function NavBadge({
  label,
  variant,
  active,
}: {
  label: string;
  variant: "new" | "pro" | "preview" | "governance";
  active?: boolean;
}) {
  if (variant === "governance") {
    return (
      <span className="ml-auto shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {label}
      </span>
    );
  }

  let base: string;
  let state: string;

  if (variant === "pro") {
    base = "menu-dropdown-badge-pro";
    state = active
      ? "menu-dropdown-badge-pro-active"
      : "menu-dropdown-badge-pro-inactive";
  } else if (variant === "preview") {
    base = "menu-dropdown-badge-preview";
    state = active
      ? "menu-dropdown-badge-preview-active"
      : "menu-dropdown-badge-preview-inactive";
  } else {
    base = "menu-dropdown-badge";
    state = active
      ? "menu-dropdown-badge-active"
      : "menu-dropdown-badge-inactive";
  }

  return <span className={cn("ml-auto shrink-0", state, base)}>{label}</span>;
}

function SidebarNavItem({
  item,
  showLabels,
}: {
  item: NavItem;
  showLabels: boolean;
}) {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);
  const hasActiveChild =
    item.subItems?.some((sub) => isActive(sub.path)) ?? false;
  const [open, setOpen] = React.useState(hasActiveChild);

  React.useEffect(() => {
    if (hasActiveChild) {
      setOpen(true);
    }
  }, [hasActiveChild]);

  if (item.subItems?.length) {
    return (
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Trigger
          className={cn(
            "group menu-item w-full cursor-pointer",
            open || hasActiveChild ? "menu-item-active" : "menu-item-inactive",
            !showLabels && "xl:justify-center",
          )}
        >
          <span
            className={cn(
              "menu-item-icon-size",
              open || hasActiveChild
                ? "menu-item-icon-active"
                : "menu-item-icon-inactive",
            )}
          >
            {item.icon}
          </span>
          {showLabels && <span className="menu-item-text">{item.name}</span>}
          {item.new && showLabels ? (
            <NavBadge label="new" variant="new" active={open} />
          ) : null}
          {item.preview && showLabels ? (
            <NavBadge
              label="预览"
              variant="preview"
              active={open || hasActiveChild}
            />
          ) : null}
          {showLabels ? (
            <ChevronDown
              className={cn(
                "ml-auto size-4 shrink-0 text-gray-400 transition-transform duration-200",
                open && "rotate-180 text-brand-500 dark:text-brand-400",
              )}
              aria-hidden
            />
          ) : null}
        </Collapsible.Trigger>
        {showLabels ? (
          <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <ul className="relative mt-1 ml-[22px] space-y-0.5 border-l border-gray-200 pl-3 dark:border-gray-800">
              {item.subItems.map((subItem) => {
                const active = isActive(subItem.path);
                return (
                  <li key={subItem.path}>
                    <Link
                      to={subItem.path}
                      target={subItem.target}
                      className={cn(
                        "menu-dropdown-item",
                        active
                          ? "menu-dropdown-item-active"
                          : "menu-dropdown-item-inactive",
                      )}
                    >
                      <span className="truncate">{subItem.name}</span>
                      <span className="ml-auto flex shrink-0 items-center gap-1">
                        {subItem.new ? (
                          <NavBadge label="new" variant="new" active={active} />
                        ) : null}
                        {subItem.pro ? (
                          <NavBadge label="pro" variant="pro" active={active} />
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Collapsible.Content>
        ) : null}
      </Collapsible.Root>
    );
  }

  if (!item.path) {
    return null;
  }

  const active = isActive(item.path);

  return (
    <Link
      to={item.path}
      target={item.target}
      title={
        item.badgeLabel
          ? "面向数据治理闭环；普通分析请使用 Dashboard。"
          : undefined
      }
      className={cn(
        "group menu-item",
        active ? "menu-item-active" : "menu-item-inactive",
        !showLabels && "xl:justify-center",
      )}
    >
      <span
        className={cn(
          "menu-item-icon-size",
          active ? "menu-item-icon-active" : "menu-item-icon-inactive",
        )}
      >
        {item.icon}
      </span>
      {showLabels ? <span className="menu-item-text">{item.name}</span> : null}
      {item.badgeLabel && showLabels ? (
        <NavBadge label={item.badgeLabel} variant="governance" active={active} />
      ) : null}
      {item.preview && showLabels ? (
        <NavBadge label="预览" variant="preview" active={active} />
      ) : null}
    </Link>
  );
}

function SidebarSection({
  section,
  showLabels,
  showDivider,
}: {
  section: NavSection;
  showLabels: boolean;
  showDivider?: boolean;
}) {
  const location = useLocation();
  const hasActiveItem = section.items.some((item) => {
    if (item.path && (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))) {
      return true;
    }
    return item.subItems?.some(
      (sub) =>
        location.pathname === sub.path || location.pathname.startsWith(`${sub.path}/`),
    );
  });
  const [open, setOpen] = React.useState(
    section.defaultCollapsed ? hasActiveItem : true,
  );

  React.useEffect(() => {
    if (hasActiveItem) setOpen(true);
  }, [hasActiveItem]);

  const body = (
    <ul className="flex flex-col gap-0.5">
      {section.items.map((item) => (
        <li key={item.name}>
          <SidebarNavItem item={item} showLabels={showLabels} />
        </li>
      ))}
    </ul>
  );

  if (!section.defaultCollapsed) {
    return (
      <div
        className={cn(
          "menu-group",
          showDivider && "border-t border-gray-100 pt-5 dark:border-white/[0.06]",
        )}
      >
        {showLabels ? (
          <h2 className="menu-group-title">{section.title}</h2>
        ) : (
          <div className="mb-2 flex justify-center px-3" aria-hidden>
            <span className="block h-px w-6 bg-gray-200 dark:bg-gray-800" />
          </div>
        )}
        {body}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "menu-group",
        showDivider && "border-t border-gray-100 pt-5 dark:border-white/[0.06]",
      )}
    >
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        {showLabels ? (
          <Collapsible.Trigger
            className="menu-group-title flex w-full cursor-pointer items-center justify-between gap-2 text-left hover:text-gray-800 dark:hover:text-white/90"
            aria-expanded={open}
          >
            <span>{section.title}</span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-gray-400 transition-transform duration-200",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </Collapsible.Trigger>
        ) : (
          <div className="mb-2 flex justify-center px-3" aria-hidden>
            <span className="block h-px w-6 bg-gray-200 dark:bg-gray-800" />
          </div>
        )}
        <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          {body}
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  );
}

export function AppSidebar({
  sections,
  logo,
  collapsedLogo,
  widget,
  leading,
  navAriaLabel = "管理端导航",
  className,
}: AppSidebarProps) {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    setIsMobileOpen,
  } = useSidebar();
  const location = useLocation();

  const showLabels = isExpanded || isHovered || isMobileOpen;
  const isWide = isExpanded || isMobileOpen || isHovered;

  React.useEffect(() => {
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
    // Close mobile drawer after navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 ease-in-out xl:translate-x-0 dark:border-gray-800 dark:bg-gray-900",
        isWide ? "w-[290px] px-5" : "w-[90px] px-3",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        className,
      )}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-gray-100 py-5 dark:border-white/[0.06]",
          !showLabels ? "xl:justify-center" : "justify-start",
        )}
      >
        {showLabels ? logo : (collapsedLogo ?? logo)}
      </div>

      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto py-4 duration-300 ease-linear">
        <nav className="flex flex-1 flex-col" aria-label={navAriaLabel}>
          {leading}
          {sections.map((section, index) => (
            <SidebarSection
              key={section.title}
              section={section}
              showLabels={showLabels}
              showDivider={index > 0}
            />
          ))}
        </nav>
        {showLabels && widget ? widget : null}
      </div>
    </aside>
  );
}
