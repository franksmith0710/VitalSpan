import { useMemo } from "react";
import { Outlet, useLocation, useMatch } from "react-router";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/context/theme-context";
import { SidebarProvider, useSidebar } from "@/context/sidebar-context";
import { WorkspaceProvider } from "@/context/workspace-context";
import { AccountSidebarBack } from "@/components/layout/account-sidebar-back";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { Backdrop } from "@/components/layout/backdrop";
import { ThemeToggleButton } from "@/components/layout/theme-toggle";
import { UserDropdown } from "@/components/layout/user-dropdown";
import { VitalSpanLogo } from "@/components/layout/vitalspan-logo";
import { resolveSidebarSections } from "@/lib/resolve-nav";
import { sessionUserFromMe } from "@/lib/session";
import { isAccountManagementPath } from "@/lib/workspace";
import { CHART_TYPES_CATALOG_PATH } from "@/lib/chartPaths";
import { isAdminListFillRoute } from "@/lib/admin-layout-routes";
import { useAuth } from "@/context/auth-context";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

function AdminLayoutContent() {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const sessionUser = authUser
    ? sessionUserFromMe(authUser)
    : sessionUserFromMe({ username: "用户", roles: ["viewer"], permissions: [], isRoot: false });
  const isAccountArea = isAccountManagementPath(location.pathname);
  const navSections = useMemo(
    () => resolveSidebarSections(sessionUser, location.pathname),
    [sessionUser, location.pathname],
  );
  const isChartTypesFill = Boolean(useMatch(CHART_TYPES_CATALOG_PATH));
  const dashboardEditMatch = useMatch("/admin/dashboards/:id/edit");
  const dashboardDetailMatch = useMatch("/admin/dashboards/:id");
  const isDashboardEditFill = Boolean(dashboardEditMatch || dashboardDetailMatch);
  const isListFillRoute = isAdminListFillRoute(location.pathname);
  const isFillHeightRoute = isChartTypesFill || isDashboardEditFill || isListFillRoute;

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden">
      <AppSidebar
        sections={navSections}
        logo={<VitalSpanLogo />}
        collapsedLogo={<VitalSpanLogo variant="icon" />}
        leading={isAccountArea ? <AccountSidebarBack /> : undefined}
        navAriaLabel={isAccountArea ? "账号导航" : "管理端导航"}
      />
      <Backdrop />
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden transition-[margin] duration-300 ease-in-out",
          isExpanded || isHovered ? "xl:ml-[290px]" : "xl:ml-[90px]",
          isMobileOpen ? "ml-0" : "",
        )}
      >
        <AppHeader
          className="shrink-0"
          logo={<VitalSpanLogo linked={false} />}
          actions={
            <>
              <ThemeToggleButton />
              <UserDropdown />
            </>
          }
        />
        <main
          className={cn(
            "mx-auto flex min-h-0 w-full max-w-(--breakpoint-2xl) flex-1 flex-col",
            isFillHeightRoute
              ? "overflow-hidden p-2 md:p-3 [&>*]:min-h-0 [&>*]:flex-1"
              : "overflow-y-auto p-4 pb-20 md:p-6 md:pb-24 [&>*]:shrink-0",
          )}
        >
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <WorkspaceProvider>
          <AdminLayoutContent />
        </WorkspaceProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}
