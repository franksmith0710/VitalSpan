import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type EntityTypeOut = {
  typeCode: string;
  displayName: string;
  attributes: unknown[];
  lifecycleStates: string[];
};

type EntityTypeListOut = {
  items: EntityTypeOut[];
};

type PhysicalTableOut = {
  tableFqn: string;
  displayName: string;
  dataSourceId: string;
  columns: unknown[];
};

type PhysicalTableListResponse = {
  items: PhysicalTableOut[];
  total: number;
};

type DashboardListItem = {
  id: string;
  name: string;
};

type DashboardListResponse = {
  items: DashboardListItem[];
};

type StatCardDef = {
  metricKey: string;
  label: string;
};

type DrillTargetDef = {
  widgetId: string;
  targetDashboardId?: string | null;
};

type EntityOverviewOut = {
  dashboardId: string;
  entityTypeRef: string;
  statCards: StatCardDef[];
  filters: unknown[];
  drillTargets: DrillTargetDef[];
};

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15">
      <p className="text-theme-sm text-error-700 dark:text-error-400">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}

function canViewEntityOverview(roles: string[]): boolean {
  return roles.some((r) => r === "admin" || r === "analyst");
}

export function EntityOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  const canRead = canViewEntityOverview(roles);

  const [activeType, setActiveType] = useState<string | null>(null);
  const [dashboardId, setDashboardId] = useState<string>("");

  const entityTypesQuery = useQuery({
    queryKey: queryKeys.metadata.entityTypes,
    queryFn: () => apiFetch<EntityTypeListOut>("/api/v1/metadata/entity-types"),
    enabled: canRead,
  });

  useEffect(() => {
    const first = entityTypesQuery.data?.items[0]?.typeCode;
    if (first && !activeType) setActiveType(first);
  }, [entityTypesQuery.data, activeType]);

  const physicalQuery = useQuery({
    queryKey: queryKeys.metadata.physicalTables(activeType ?? undefined),
    enabled: Boolean(activeType) && canRead,
    queryFn: () =>
      apiFetch<PhysicalTableListResponse>(
        `/api/v1/metadata/physical-tables?entityTypeCode=${encodeURIComponent(activeType!)}`,
      ),
  });

  const dashboardsQuery = useQuery({
    queryKey: queryKeys.dashboards.list(),
    queryFn: () => apiFetch<DashboardListResponse>("/api/v1/dashboards"),
    enabled: canRead,
  });

  useEffect(() => {
    const first = dashboardsQuery.data?.items[0]?.id;
    if (first && !dashboardId) setDashboardId(first);
  }, [dashboardsQuery.data, dashboardId]);

  const overviewQuery = useQuery({
    queryKey: queryKeys.metadata.entityOverview(dashboardId),
    enabled: Boolean(dashboardId) && canRead,
    queryFn: () =>
      apiFetch<EntityOverviewOut>(`/api/v1/dashboards/${dashboardId}/entity-overview`),
  });

  const drillTargetId = useMemo(() => {
    const targets = overviewQuery.data?.drillTargets ?? [];
    return targets.find((t) => t.targetDashboardId)?.targetDashboardId ?? null;
  }, [overviewQuery.data]);

  if (!canRead) {
    return (
      <AdminPageShell title="实体总览" description="按实体类型浏览登记物理表并下钻至 Dashboard。">
        <Card>
          <CardContent className="py-10 text-center text-theme-sm text-gray-600 dark:text-gray-400">
            无权查看实体总览
          </CardContent>
        </Card>
      </AdminPageShell>
    );
  }

  const entityTypes = entityTypesQuery.data?.items ?? [];
  const physicalItems = physicalQuery.data?.items ?? [];
  const statCards = overviewQuery.data?.statCards ?? [];

  return (
    <AdminPageShell
      title="实体总览"
      description="按实体类型浏览登记物理表并下钻至 Dashboard。"
    >
      {entityTypesQuery.isError ? (
        <ErrorBanner message={mapApiError(entityTypesQuery.error)} onRetry={() => void entityTypesQuery.refetch()} />
      ) : null}

      {entityTypesQuery.isLoading ? (
        <Skeleton className="h-10 w-full max-w-xl" />
      ) : entityTypes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-theme-sm text-gray-600 dark:text-gray-400">
            请先配置实体类型
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {entityTypes.map((t) => (
              <Button
                key={t.typeCode}
                type="button"
                variant="outline"
                size="sm"
                className={
                  activeType === t.typeCode
                    ? "border-brand-500 bg-brand-50 text-brand-600 focus-visible:ring-2 dark:bg-brand-500/15 dark:text-brand-400"
                    : "focus-visible:ring-2"
                }
                onClick={() => setActiveType(t.typeCode)}
              >
                {t.displayName}
              </Button>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-theme-sm text-gray-600 dark:text-gray-400">
          <span>关联 Dashboard</span>
          <Select value={dashboardId} onValueChange={setDashboardId}>
            <SelectTrigger className="w-[220px]" aria-label="选择 Dashboard">
              <SelectValue placeholder="选择 Dashboard" />
            </SelectTrigger>
            <SelectContent>
              {(dashboardsQuery.data?.items ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {activeType ? (
          <Badge variant="light" color="primary" size="sm">
            {entityTypes.find((t) => t.typeCode === activeType)?.displayName ?? activeType}
          </Badge>
        ) : null}
      </div>

      {overviewQuery.isError ? (
        <ErrorBanner message={mapApiError(overviewQuery.error)} onRetry={() => void overviewQuery.refetch()} />
      ) : null}

      {overviewQuery.isLoading && dashboardId ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : statCards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.metricKey}>
              <CardHeader className="pb-2">
                <CardTitle className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                  {card.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-title-sm font-semibold tabular-nums text-gray-800 dark:text-white/90">
                  {card.metricKey === "count" ? (physicalQuery.data?.total ?? "—") : "—"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {physicalQuery.isError ? (
        <ErrorBanner message={mapApiError(physicalQuery.error)} onRetry={() => void physicalQuery.refetch()} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-theme-sm font-semibold">登记物理表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {physicalQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : physicalItems.length === 0 ? (
            <p className="p-6 text-center text-theme-sm text-gray-600 dark:text-gray-400">
              暂无登记的实体表
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-left text-theme-sm">
                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">显示名</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">tableFqn</th>
                    <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {physicalItems.map((row) => (
                    <tr
                      key={row.tableFqn}
                      className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                    >
                      <td className="px-4 py-3 text-gray-800 dark:text-white/90">{row.displayName}</td>
                      <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                        {row.tableFqn}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="focus-visible:ring-2"
                          disabled={!drillTargetId}
                          onClick={() => {
                            if (drillTargetId) navigate(`/admin/dashboards/${drillTargetId}`);
                          }}
                        >
                          下钻
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
