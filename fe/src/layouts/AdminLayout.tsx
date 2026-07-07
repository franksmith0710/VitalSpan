import { Outlet, useMatch } from "react-router";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/context/theme-context";
import { SidebarProvider, useSidebar } from "@/context/sidebar-context";
import { WorkspaceProvider } from "@/context/workspace-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { Backdrop } from "@/components/layout/backdrop";
import { ThemeToggleButton } from "@/components/layout/theme-toggle";
import { UserDropdown } from "@/components/layout/user-dropdown";
import { VitalSpanLogo } from "@/components/layout/vitalspan-logo";
import { resolveNavGroups } from "@/lib/resolve-nav";
import { sessionUserFromAuth } from "@/lib/session";
import { useAuth } from "@/context/auth-context";

function AdminLayoutContent() {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { user: authUser } = useAuth();
  const sessionUser = authUser
    ? sessionUserFromAuth(authUser.username, authUser.roles)
    : sessionUserFromAuth("用户", ["viewer"]);
  const navSections = resolveNavGroups(sessionUser);
  const isFillHeightRoute = Boolean(useMatch("/admin/charts/explore"));

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 overflow-hidden">
      <AppSidebar
        sections={navSections}
        logo={<VitalSpanLogo />}
        collapsedLogo={<VitalSpanLogo variant="icon" />}
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
            "mx-auto flex min-h-0 w-full max-w-(--breakpoint-2xl) flex-1 flex-col p-4 pb-20 md:p-6 md:pb-24 [&>*]:min-h-0",
            isFillHeightRoute ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
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
