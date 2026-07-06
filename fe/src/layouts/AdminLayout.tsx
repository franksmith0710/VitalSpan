import { Outlet } from "react-router";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/context/theme-context";
import { SidebarProvider, useSidebar } from "@/context/sidebar-context";
import { WorkspaceProvider } from "@/context/workspace-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { Backdrop } from "@/components/layout/backdrop";
import { ReturnToWorkspaceButton } from "@/components/layout/return-to-workspace-button";
import { ThemeToggleButton } from "@/components/layout/theme-toggle";
import { UserDropdown } from "@/components/layout/user-dropdown";
import { VitalSpanLogo } from "@/components/layout/vitalspan-logo";
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";
import { USER_NAV_GROUPS } from "@/config/user-nav";
import { canManagePlatform, getSessionUser } from "@/lib/session";

function AdminLayoutContent() {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const sessionUser = getSessionUser();
  const navSections = canManagePlatform(sessionUser)
    ? ADMIN_NAV_GROUPS
    : USER_NAV_GROUPS;

  return (
    <div className="h-full min-h-screen">
      <AppSidebar
        sections={navSections}
        logo={<VitalSpanLogo />}
        collapsedLogo={<VitalSpanLogo variant="icon" />}
      />
      <Backdrop />
      <div
        className={cn(
          "flex h-full min-h-0 flex-col transition-[margin] duration-300 ease-in-out",
          isExpanded || isHovered ? "xl:ml-[290px]" : "xl:ml-[90px]",
          isMobileOpen ? "ml-0" : "",
        )}
      >
        <AppHeader
          logo={<VitalSpanLogo linked={false} />}
          actions={
            <>
              <ReturnToWorkspaceButton />
              <ThemeToggleButton />
              <UserDropdown />
            </>
          }
        />
        <main className="mx-auto min-h-0 w-full max-w-(--breakpoint-2xl) flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-24">
          <Outlet />
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
