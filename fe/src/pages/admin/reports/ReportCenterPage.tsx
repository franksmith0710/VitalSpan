import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { FileBarChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import { PageErrorBanner } from "@/components/layout/list-page-kit";
import { apiFetch } from "@/lib/api";
import { matchesCapability, resolveEffectiveCapabilities } from "@/lib/capabilities";
import { mapApiError } from "@/lib/apiError";
import { fetchAllCatalogTemplates } from "@/lib/reportCatalogUtils";
import { queryKeys } from "@/lib/queryKeys";
import {
  canRetryReportSchedules,
  localizeCenterResourceType,
  resolveCenterRecentHref,
} from "@/lib/reportCenterNav";
import { sortStandardByPin } from "@/lib/reportCenterPrefs";
import { useReportCenterPreferences } from "./useReportCenterPrefs";
import { useAuth } from "@/context/auth-context";
import { ReportCenterHeaderActions, ReportCenterQuickAside } from "./components/ReportCenterScheduleHub";
import { ReportCenterHubEntryCards } from "./components/ReportCenterHubEntryCards";
import { ReportCenterTabNav } from "./components/ReportCenterTabNav";
import { ScheduleRecentFailuresPanel } from "./components/ScheduleRecentFailuresPanel";
import { useReportSchedulesList, useReportScheduleMutations } from "./useReportSchedules";

type AnalysisPackSummary = {
  packKey: string;
  displayName: string;
  enabledThemes: string[];
};

export function ReportCenterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const caps = resolveEffectiveCapabilities(user);
  const centerPrefsQuery = useReportCenterPreferences();
  const schedulesQuery = useReportSchedulesList();
  const { retryExecution } = useReportScheduleMutations();

  const templatesQuery = useQuery({
    queryKey: ["reports", "center", "templates"],
    queryFn: fetchAllCatalogTemplates,
    enabled: matchesCapability(caps, "report:manage"),
  });

  const standardQuery = useQuery({
    queryKey: queryKeys.reports.standardPacks,
    queryFn: () =>
      apiFetch<{ items: AnalysisPackSummary[]; total: number }>("/api/v1/reports/standard/packs"),
    enabled: matchesCapability(caps, "report:read"),
  });

  const canManage = matchesCapability(caps, "report:manage");
  const canRetrySchedules = canRetryReportSchedules(caps);
  const recentViews = centerPrefsQuery.data?.recent ?? [];
  const standardItems = standardQuery.data?.items ?? [];
  const pinnedKeys = useMemo(
    () =>
      (centerPrefsQuery.data?.favorites ?? [])
        .filter((f) => f.resourceType === "standard")
        .map((f) => f.resourceId),
    [centerPrefsQuery.data],
  );
  const sortedStandardItems = useMemo(
    () => sortStandardByPin(standardItems, pinnedKeys),
    [standardItems, pinnedKeys],
  );
  const pinnedStandard = sortedStandardItems[0] ?? null;
  const schedules = schedulesQuery.data?.items ?? [];
  const activeScheduleCount = schedules.filter((item) => item.status === "scheduled").length;

  return (
    <AdminPageShell
      title="报表中心"
      icon={
        <AdminPageHeaderIcon>
          <FileBarChart className="size-6" aria-hidden />
        </AdminPageHeaderIcon>
      }
      description="统一入口：标准分析、文档模板与定时投递。"
      actions={<ReportCenterHeaderActions canManage={canManage} />}
    >
      <ReportCenterTabNav />
      {schedulesQuery.isError ? (
        <PageErrorBanner
          message={mapApiError(schedulesQuery.error)}
          onRetry={() => void schedulesQuery.refetch()}
        />
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="order-2 min-w-0 space-y-6 xl:order-1">
          <ReportCenterHubEntryCards
            standardCount={standardItems.length}
            pinnedStandard={pinnedStandard}
            templateCount={templatesQuery.data?.length ?? 0}
            activeScheduleCount={activeScheduleCount}
            canManage={canManage}
          />

          <ScheduleRecentFailuresPanel
            schedules={schedules}
            onSelectSchedule={(id) => navigate(`/admin/reports/schedules?tab=all&expand=${id}`)}
            onRetry={
              canRetrySchedules
                ? (executionId, scheduleId) =>
                    void retryExecution.mutateAsync({ executionId, scheduleId })
                : undefined
            }
            retryPending={retryExecution.isPending}
            retryPendingExecutionId={
              retryExecution.isPending ? retryExecution.variables?.executionId : undefined
            }
          />

          {recentViews.length > 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">最近访问</p>
              <ul className="mt-3 space-y-2">
                {recentViews.slice(0, 8).map((item) => (
                  <li key={`${item.resourceType}-${item.resourceId}`}>
                    <Link
                      to={resolveCenterRecentHref(item)}
                      className="flex flex-wrap items-baseline gap-2 rounded-lg px-2 py-1.5 text-theme-xs text-gray-700 transition-colors hover:bg-gray-50 hover:text-brand-600 dark:text-gray-300 dark:hover:bg-white/[0.04] dark:hover:text-brand-400"
                    >
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {item.resourceLabel || item.resourceId}
                      </span>
                      <span className="text-gray-400">
                        {localizeCenterResourceType(item.resourceType)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="order-1 min-w-0 xl:order-2 xl:sticky xl:top-0 xl:self-start">
          <ReportCenterQuickAside
            schedules={schedules}
            loading={schedulesQuery.isLoading}
            canManage={canManage}
          />
        </div>
      </div>
    </AdminPageShell>
  );
}
