import { useQuery } from "@tanstack/react-query";
import { MousePointerClick } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { ChartConfigPanel } from "@/components/charts/ChartConfigPanel";
import { useInspectorColumns } from "@/hooks/useInspectorColumns";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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

  const body = (
    <>
      <div className="flex items-start gap-3 border-b border-gray-100 pb-4 dark:border-white/[0.06]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {widget.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="light" color="light" size="sm">
              {typeLabel}
            </Badge>
            <Badge
              variant="light"
              color={datasetReady || (dataMode === "sql" && !dsMissing) ? "success" : "error"}
              size="sm"
            >
              {dataMode === "dataset"
                ? datasetReady
                  ? "Dataset 就绪"
                  : "Dataset 未就绪"
                : dsMissing
                  ? "未选数据源"
                  : "SQL 模式"}
            </Badge>
          </div>
        </div>
      </div>

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

      <div className="mt-4 grid gap-2">
        <Label>图表样式与字段</Label>
        {columnsReady && columnsLoading ? (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">正在加载字段…</p>
        ) : null}
        {columnsReady && !columnsLoading && columns.length === 0 ? (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            未获取到字段，请确认 Dataset 已绑定配置或 SQL 可执行。
          </p>
        ) : null}
        <ChartConfigPanel config={cfg} columns={columns} onChange={onChange} />
      </div>

      {onDelete ? <WidgetInspectorDelete widgetTitle={widget.title} onDelete={onDelete} /> : null}
    </>
  );

  if (embedded) {
    return <div className={cn("w-full", className)}>{body}</div>;
  }

  return (
    <aside
      className={cn(
        "w-full shrink-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] xl:w-[300px]",
        className,
      )}
    >
      {body}
    </aside>
  );
}
