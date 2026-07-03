import { Outlet } from "react-router";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/context/theme-context";
import { SidebarProvider, useSidebar } from "@/context/sidebar-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { Backdrop } from "@/components/layout/backdrop";
import { ThemeToggleButton } from "@/components/layout/theme-toggle";
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav";

function AdminLayoutContent() {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen">
      <AppSidebar
        sections={ADMIN_NAV_GROUPS}
        logo={
          <span className="text-theme-xl font-semibold text-gray-900 dark:text-white">
            VitalSpan
          </span>
        }
      />
      <Backdrop />
      <div
        className={cn(
          "flex min-h-screen flex-col transition-[margin] duration-300 ease-in-out",
          isExpanded || isHovered ? "xl:ml-[290px]" : "xl:ml-[90px]",
          isMobileOpen ? "ml-0" : "",
        )}
      >
        <AppHeader
          actions={
            <div className="flex items-center gap-3">
              <ThemeToggleButton />
              <span className="hidden text-theme-sm text-gray-500 sm:inline dark:text-gray-400">
                管理员
              </span>
            </div>
          }
        />
        <main className="mx-auto w-full max-w-(--breakpoint-2xl) flex-1 p-4 md:p-6">
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
        <AdminLayoutContent />
      </SidebarProvider>
    </ThemeProvider>
  );
}
