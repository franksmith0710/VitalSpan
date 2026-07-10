import { useQuery } from "@tanstack/react-query";
import { MousePointerClick } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { ChartConfigPanel } from "@/components/charts/ChartConfigPanel";
import { useInspectorColumns } from "@/hooks/useInspectorColumns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LayoutWidget } from "./layoutUtils";
import { defaultChartConfig } from "./layoutUtils";
import { widgetChartIcon, WIDGET_CHART_LABELS } from "./widgetIcons";
import { WidgetInspectorDelete } from "./widget-inspector-delete";
import { WidgetInspectorDataSection } from "./WidgetInspectorDataSection";

type DataSourceListItem = { id: string; name: string; code: string };
type DatasetListItem = {
  datasetId: string;
  displayName: string;
  boundConfigId?: string | null;
};

const FALLBACK_CONFIG = defaultChartConfig("table");

type WidgetInspectorProps = {
  widget: LayoutWidget | null;
  onChange: (chartConfig: ChartViewConfig) => void;
  onDelete?: () => void;
  className?: string;
  embedded?: boolean;
};

function resolveDataMode(cfg: ChartViewConfig): "dataset" | "sql" {
  if (cfg.mode === "sql" || (cfg.sql && cfg.mode !== "dataset")) return "sql";
  return "dataset";
}

function InspectorEmpty({ embedded }: { embedded?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-10 text-center",
        !embedded &&
          "rounded-2xl border border-dashed border-gray-300 bg-white shadow-theme-xs dark:border-gray-700 dark:bg-white/[0.02]",
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500">
        <MousePointerClick className="size-5" aria-hidden />
      </span>
      <p className="mt-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">未选中组件</p>
      <p className="mt-1 max-w-[220px] text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
        在画布中点击图表卡片，在此配置数据源、Dataset 或 SQL。
      </p>
    </div>
  );
}

function readinessBadge(
  dataMode: "dataset" | "sql",
  datasetReady: boolean,
  dsMissing: boolean,
) {
  if (dataMode === "dataset") {
    return datasetReady ? ("Dataset 就绪" as const) : ("Dataset 未就绪" as const);
  }
  return dsMissing ? ("未选数据源" as const) : ("SQL 模式" as const);
}

export function WidgetInspector({
  widget,
  onChange,
  onDelete,
  className,
  embedded = false,
}: WidgetInspectorProps) {
  const cfg = widget?.chartConfig ?? FALLBACK_CONFIG;
  const { columns, loading: columnsLoading, ready: columnsReady } = useInspectorColumns(cfg);

  const { data: dsData, isLoading: dsLoading } = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DataSourceListItem[] }>("/api/v1/datasources"),
  });

  const {
    data: datasetData,
    isLoading: datasetsLoading,
    isError: datasetsError,
  } = useQuery({
    queryKey: queryKeys.datasets.list({ limit: 200, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: DatasetListItem[] }>("/api/v1/datasets?limit=200&offset=0"),
  });

  if (!widget) {
    return (
      <div className={cn("w-full", className)}>
        <InspectorEmpty embedded={embedded} />
      </div>
    );
  }

  const dataMode = resolveDataMode(cfg);
  const Icon = widgetChartIcon(cfg.chartType);
  const typeLabel = WIDGET_CHART_LABELS[cfg.chartType] ?? cfg.chartType;
  const dsMissing = !cfg.dataSourceId;
  const datasetReady = Boolean(cfg.configId && cfg.dataSourceId);
  const datasetItems = datasetData?.items ?? [];
  const datasourceItems = dsData?.items ?? [];
  const datasetsEmpty = !datasetsLoading && !datasetsError && datasetItems.length === 0;
  const datasourcesEmpty = !dsLoading && datasourceItems.length === 0;
  const selectedDataset = datasetItems.find((d) => d.datasetId === cfg.datasetId);
  const statusLabel = readinessBadge(dataMode, datasetReady, dsMissing);
  const statusColor =
    statusLabel === "Dataset 就绪" || statusLabel === "SQL 模式" ? "success" : "error";

  const body = (
    <div className={cn("flex min-h-0 flex-1 flex-col", embedded && "h-full")}>
      <div className="shrink-0 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {widget.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="light" color="light" size="sm">
                {typeLabel}
              </Badge>
              <Badge variant="light" color={statusColor} size="sm">
                {statusLabel}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-5">
          <WidgetInspectorDataSection
            widgetId={widget.id}
            cfg={cfg}
            dataMode={dataMode}
            dsLoading={dsLoading}
            datasetsLoading={datasetsLoading}
            datasetsError={datasetsError}
            datasourceItems={datasourceItems}
            datasetItems={datasetItems}
            datasetsEmpty={datasetsEmpty}
            datasourcesEmpty={datasourcesEmpty}
            selectedDataset={selectedDataset}
            onChange={onChange}
          />

          <div
            role="separator"
            className="border-t border-gray-100 dark:border-white/[0.06]"
            aria-hidden
          />

          <div className="space-y-3">
            {columnsReady && columnsLoading ? (
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">正在加载字段…</p>
            ) : null}
            {columnsReady && !columnsLoading && columns.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2 text-theme-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
                配置数据源并执行查询后，可设置维度、指标与筛选。
              </p>
            ) : null}
            <ChartConfigPanel config={cfg} columns={columns} onChange={onChange} compact />
          </div>
        </div>
      </div>

      {onDelete ? (
        <div className="shrink-0 border-t border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <WidgetInspectorDelete widgetTitle={widget.title} onDelete={onDelete} embedded />
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className={cn("flex h-full min-h-0 w-full flex-col", className)}>{body}</div>;
  }

  return (
    <aside
      className={cn(
        "w-full shrink-0 rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] xl:w-[300px]",
        className,
      )}
    >
      {body}
    </aside>
  );
}
