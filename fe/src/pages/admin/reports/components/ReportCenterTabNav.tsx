import { Link, useLocation } from "react-router";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { useAuth } from "@/context/auth-context";
import {
  HUB_SEGMENTED_BUTTON_CLASS,
  HUB_SEGMENTED_SHELL_CLASS,
} from "@/components/dashboard/hubFilterUi";
import { cn } from "@/lib/utils";
import { resolveReportCenterSubNavPath } from "@/lib/reportCenterNav";

type TabDef = {
  label: string;
  path: string;
  capability?: string;
};

const TABS: TabDef[] = [
  { label: "概览", path: "/admin/reports/center", capability: "report:read" },
  { label: "标准分析", path: "/admin/reports/standard", capability: "report:read" },
  { label: "文档模板", path: "/admin/reports/templates", capability: "report:manage" },
  { label: "调度与投递", path: "/admin/reports/schedules", capability: "report:manage" },
];

export function ReportCenterTabNav({ className }: { className?: string }) {
  const { user } = useAuth();
  const caps = resolveEffectiveCapabilities(user);
  const location = useLocation();
  const activePath = resolveReportCenterSubNavPath(location.pathname) ?? "/admin/reports/center";

  const visibleTabs = TABS.filter(
    (tab) => !tab.capability || matchesCapability(caps, tab.capability),
  );

  return (
    <nav
      aria-label="报表中心"
      className={cn("shrink-0 border-b border-gray-200 px-1 py-2 dark:border-gray-800", className)}
    >
      <div className={cn(HUB_SEGMENTED_SHELL_CLASS, "inline-flex flex-wrap gap-0.5")}>
        {visibleTabs.map((tab) => {
          const active = activePath === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                HUB_SEGMENTED_BUTTON_CLASS,
                "inline-flex items-center rounded-md px-3 text-theme-xs font-medium transition-colors",
                active
                  ? "bg-gray-100 text-gray-900 dark:bg-white/[0.08] dark:text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-white",
              )}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
