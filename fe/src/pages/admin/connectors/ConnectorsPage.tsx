import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import {
  connectorTypeIcon,
  DISPLAY_GROUP_ORDER,
  firstNonEmptyGroup,
  groupTypesByDisplayGroup,
  type ConnectorTypeItem,
} from "@/lib/connector-taxonomy";
import { queryKeys } from "@/lib/queryKeys";

type ConnectorTypeListResponse = { items: ConnectorTypeItem[] };

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

function ConnectorTable({ items }: { items: ConnectorTypeItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <table className="min-w-[720px] w-full text-left text-theme-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <tr>
            <th className="w-12 px-4 py-3" />
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">显示名称</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">类型标识</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">能力</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const Icon = connectorTypeIcon(item.type, item.displayGroup);
            return (
              <tr key={item.type} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3">
                  <Icon className="size-5 text-brand-500" aria-hidden />
                </td>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">{item.displayName}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.type}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.capabilities.map((cap) => (
                      <Badge key={cap} variant="light" color="primary">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ConnectorsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.connectorTypes,
    queryFn: () => apiFetch<ConnectorTypeListResponse>("/api/v1/datasources/types"),
  });

  const grouped = useMemo(
    () => groupTypesByDisplayGroup(data?.items ?? []),
    [data?.items],
  );

  const visibleGroups = useMemo(
    () => DISPLAY_GROUP_ORDER.filter((g) => (grouped.get(g)?.length ?? 0) > 0),
    [grouped],
  );

  const defaultTab = useMemo(() => firstNonEmptyGroup(grouped), [grouped]);

  return (
    <AdminPageShell title="连接器类型" description="查看平台已注册的连接器类型与能力清单（只读）。">
      {isError ? <ErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} /> : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : null}

      {!isLoading && data?.items.length === 0 ? (
        <p className="text-center text-theme-sm text-gray-500 dark:text-gray-400">暂无已注册连接器类型</p>
      ) : null}

      {!isLoading && visibleGroups.length > 0 ? (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList variant="line" className="w-full overflow-x-auto">
            {visibleGroups.map((group) => {
              const items = grouped.get(group) ?? [];
              const label = items[0]?.categoryLabel ?? group;
              return (
                <TabsTrigger
                  key={group}
                  value={group}
                  aria-label={`${label}，${items.length} 种连接器`}
                >
                  {label} ({items.length})
                </TabsTrigger>
              );
            })}
          </TabsList>
          {visibleGroups.map((group) => (
            <TabsContent key={group} value={group}>
              <ConnectorTable items={grouped.get(group) ?? []} />
            </TabsContent>
          ))}
        </Tabs>
      ) : null}
    </AdminPageShell>
  );
}
