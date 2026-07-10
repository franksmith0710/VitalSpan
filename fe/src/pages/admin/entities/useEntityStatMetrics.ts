import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

export type StatCardMetric = {
  metricKey: string;
  metricSource?: { widgetId: string } | null;
};

type DashboardDetail = {
  layoutJson?: {
    widgets?: Array<{
      id?: string;
      chartConfig?: ChartViewConfig;
    }>;
  };
};

type ExecuteResult = {
  columns: string[];
  rows: (string | number | boolean | null)[][];
};

function findWidgetMetricConfig(
  dashboard: DashboardDetail | undefined,
  widgetId: string,
): ChartViewConfig | null {
  const widget = dashboard?.layoutJson?.widgets?.find((w) => String(w.id) === widgetId);
  return widget?.chartConfig ?? null;
}

function extractMetricValue(result: ExecuteResult | undefined, metricKey: string): string | null {
  if (!result?.rows.length) return null;
  const idx = result.columns.indexOf(metricKey);
  if (idx < 0) return null;
  const raw = result.rows[0][idx];
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw);
}

export function useEntityStatMetrics(
  dashboardId: string,
  statCards: StatCardMetric[],
  enabled: boolean,
) {
  const sourcedCards = useMemo(
    () => statCards.filter((c) => c.metricSource?.widgetId && c.metricKey !== "count"),
    [statCards],
  );

  const dashboardQuery = useQuery({
    queryKey: ["dashboards", "detail", dashboardId],
    enabled: enabled && Boolean(dashboardId) && sourcedCards.length > 0,
    queryFn: () => apiFetch<DashboardDetail>(`/api/v1/dashboards/${dashboardId}`),
  });

  const widgetIds = useMemo(
    () => [...new Set(sourcedCards.map((c) => c.metricSource!.widgetId))],
    [sourcedCards],
  );

  const executeQueries = useQuery({
    queryKey: ["entityOverview", "metricSource", dashboardId, widgetIds],
    enabled: enabled && Boolean(dashboardQuery.data) && widgetIds.length > 0,
    queryFn: async () => {
      const dashboard = dashboardQuery.data!;
      const results: Record<string, ExecuteResult> = {};
      await Promise.all(
        widgetIds.map(async (widgetId) => {
          const config = findWidgetMetricConfig(dashboard, widgetId);
          if (!config?.dataSourceId && !config?.bindingId) return;
          const body: Record<string, unknown> = {
            dataSourceId: config.dataSourceId,
            mode: config.mode ?? "sql",
            sql: config.sql,
            schema: config.schema,
            table: config.table,
            bindingId: config.bindingId,
            limit: 1,
          };
          results[widgetId] = await apiFetch<ExecuteResult>("/api/v1/query/execute", {
            method: "POST",
            body: JSON.stringify(body),
          });
        }),
      );
      return results;
    },
  });

  const valuesByMetricKey = useMemo(() => {
    const out: Record<string, string> = {};
    if (!dashboardQuery.data || !executeQueries.data) return out;
    for (const card of sourcedCards) {
      const widgetId = card.metricSource!.widgetId;
      const config = findWidgetMetricConfig(dashboardQuery.data, widgetId);
      const metricFields = config?.metrics?.map((m) => m.field) ?? [];
      if (!metricFields.includes(card.metricKey)) continue;
      const value = extractMetricValue(executeQueries.data[widgetId], card.metricKey);
      if (value !== null) out[card.metricKey] = value;
    }
    return out;
  }, [dashboardQuery.data, executeQueries.data, sourcedCards]);

  return {
    valuesByMetricKey,
    loading: dashboardQuery.isLoading || executeQueries.isLoading,
  };
}
