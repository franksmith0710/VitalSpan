import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { MousePointerClick } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { LayoutWidget } from "./layoutUtils";
import { widgetChartIcon, WIDGET_CHART_LABELS } from "./widgetIcons";
import { WidgetInspectorDelete } from "./widget-inspector-delete";

type DataSourceListItem = { id: string; name: string; code: string };
type DatasetListItem = {
  datasetId: string;
  displayName: string;
  boundConfigId?: string | null;
};

const EMPTY_DATASET_VALUE = "__empty_datasets__";
const EMPTY_DATASOURCE_VALUE = "__empty_datasources__";

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

  const cfg = widget.chartConfig;
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

  const setMode = (mode: "dataset" | "sql") => {
    if (mode === "sql") {
      onChange({ ...cfg, mode: "sql", datasetId: undefined, configId: undefined });
      return;
    }
    onChange({ ...cfg, mode: "dataset", sql: undefined });
  };

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

      <div className="mt-4 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor={`ds-${widget.id}`}>数据源</Label>
          <Select
            value={cfg.dataSourceId || undefined}
            onValueChange={(dataSourceId) => onChange({ ...cfg, dataSourceId })}
          >
            <SelectTrigger id={`ds-${widget.id}`} className="h-11">
              <SelectValue placeholder={dsLoading ? "加载中…" : "选择数据源"} />
            </SelectTrigger>
            <SelectContent>
              {dsLoading ? (
                <SelectItem value={EMPTY_DATASOURCE_VALUE} disabled className="text-gray-500">
                  加载中…
                </SelectItem>
              ) : datasourcesEmpty ? (
                <SelectItem value={EMPTY_DATASOURCE_VALUE} disabled className="text-gray-500">
                  暂无数据源
                </SelectItem>
              ) : (
                datasourceItems.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id}>
                    {ds.name} ({ds.code})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {datasourcesEmpty ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              请先在{" "}
              <Link to="/admin/datasources" className="underline text-brand-600 dark:text-brand-400">
                数据源管理
              </Link>{" "}
              中创建连接。
            </p>
          ) : null}
        </div>

        <Tabs value={dataMode} onValueChange={(v) => setMode(v as "dataset" | "sql")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dataset">Dataset</TabsTrigger>
            <TabsTrigger value="sql">高级 SQL</TabsTrigger>
          </TabsList>
          <TabsContent value="dataset" className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`dataset-${widget.id}`}>Dataset</Label>
              <Select
                value={cfg.datasetId || undefined}
                onValueChange={(datasetId) => {
                  if (datasetId === EMPTY_DATASET_VALUE) return;
                  const ds = datasetItems.find((d) => d.datasetId === datasetId);
                  onChange({
                    ...cfg,
                    mode: "dataset",
                    datasetId,
                    configId: ds?.boundConfigId ?? undefined,
                    sql: undefined,
                  });
                }}
              >
                <SelectTrigger id={`dataset-${widget.id}`} className="h-11">
                  <SelectValue placeholder={datasetsLoading ? "加载中…" : "选择 Dataset"} />
                </SelectTrigger>
                <SelectContent>
                  {datasetsLoading ? (
                    <SelectItem value={EMPTY_DATASET_VALUE} disabled className="text-gray-500">
                      加载中…
                    </SelectItem>
                  ) : datasetsError ? (
                    <SelectItem value={EMPTY_DATASET_VALUE} disabled className="text-gray-500">
                      加载失败，请刷新重试
                    </SelectItem>
                  ) : datasetsEmpty ? (
                    <SelectItem value={EMPTY_DATASET_VALUE} disabled className="text-gray-500">
                      暂无 Dataset
                    </SelectItem>
                  ) : (
                    datasetItems.map((ds) => (
                      <SelectItem key={ds.datasetId} value={ds.datasetId}>
                        {ds.displayName}
                        {!ds.boundConfigId ? "（未绑定配置）" : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {datasetsEmpty ? (
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                当前没有可用的 Dataset。请先在{" "}
                <Link to="/admin/datasets" className="underline text-brand-600 dark:text-brand-400">
                  Dataset 管理
                </Link>{" "}
                中创建并绑定查询配置；或切换到「高级 SQL」直接写查询。
              </p>
            ) : null}
            {selectedDataset && !selectedDataset.boundConfigId ? (
              <p className="text-theme-xs text-warning-600 dark:text-warning-400">
                该 Dataset 尚未绑定查询配置，请先在{" "}
                <Link to="/admin/datasets" className="underline">
                  Dataset 管理
                </Link>{" "}
                中绑定。
              </p>
            ) : null}
            {cfg.configId ? (
              <p className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                配置 ID：{cfg.configId.slice(0, 8)}…
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="sql" className="mt-4 grid gap-2">
            <Label htmlFor={`sql-${widget.id}`}>SQL</Label>
            <textarea
              id={`sql-${widget.id}`}
              value={cfg.sql ?? ""}
              onChange={(e) => onChange({ ...cfg, mode: "sql", sql: e.target.value })}
              rows={8}
              placeholder="SELECT ..."
              className={cn(
                "w-full resize-y rounded-lg border border-gray-300 bg-transparent px-3 py-2 font-mono text-theme-sm text-gray-800",
                "focus-visible:border-brand-300 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/10",
                "dark:border-gray-700 dark:text-white/90",
              )}
            />
          </TabsContent>
        </Tabs>
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
