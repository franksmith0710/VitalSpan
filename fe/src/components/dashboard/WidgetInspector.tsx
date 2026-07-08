import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
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

type DataSourceListItem = { id: string; name: string; code: string };
type DatasetListItem = {
  datasetId: string;
  displayName: string;
  boundConfigId?: string | null;
};

type WidgetInspectorProps = {
  widget: LayoutWidget | null;
  onChange: (chartConfig: ChartViewConfig) => void;
  className?: string;
};

function resolveDataMode(cfg: ChartViewConfig): "dataset" | "sql" {
  if (cfg.mode === "sql" || (cfg.sql && cfg.mode !== "dataset")) return "sql";
  return "dataset";
}

export function WidgetInspector({ widget, onChange, className }: WidgetInspectorProps) {
  const { data: dsData } = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DataSourceListItem[] }>("/api/v1/datasources"),
  });

  const { data: datasetData } = useQuery({
    queryKey: queryKeys.datasets.list({ limit: 200, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: DatasetListItem[] }>("/api/v1/datasets?limit=200&offset=0"),
  });

  if (!widget) {
    return (
      <aside
        className={cn(
          "w-full shrink-0 rounded-2xl border border-dashed border-gray-300 bg-white p-5 shadow-theme-xs dark:border-gray-700 dark:bg-white/[0.02] xl:w-[300px]",
          className,
        )}
      >
        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">组件配置</p>
        <p className="mt-2 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
          点击画布中的组件，在此配置 Dataset 或 SQL。
        </p>
      </aside>
    );
  }

  const cfg = widget.chartConfig;
  const dataMode = resolveDataMode(cfg);
  const Icon = widgetChartIcon(cfg.chartType);
  const typeLabel = WIDGET_CHART_LABELS[cfg.chartType] ?? cfg.chartType;
  const dsMissing = !cfg.dataSourceId;
  const datasetReady = Boolean(cfg.configId && cfg.dataSourceId);
  const selectedDataset = (datasetData?.items ?? []).find((d) => d.datasetId === cfg.datasetId);

  const setMode = (mode: "dataset" | "sql") => {
    if (mode === "sql") {
      onChange({ ...cfg, mode: "sql", datasetId: undefined, configId: undefined });
      return;
    }
    onChange({ ...cfg, mode: "dataset", sql: undefined });
  };

  return (
    <aside
      className={cn(
        "w-full shrink-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] xl:w-[300px]",
        className,
      )}
    >
      <div className="flex items-start gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">组件配置</p>
          <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">{widget.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="light" color="light" size="sm">
              {typeLabel}
            </Badge>
            <Badge variant="light" color={datasetReady || (dataMode === "sql" && !dsMissing) ? "success" : "error"} size="sm">
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
              <SelectValue placeholder="选择数据源" />
            </SelectTrigger>
            <SelectContent>
              {(dsData?.items ?? []).map((ds) => (
                <SelectItem key={ds.id} value={ds.id}>
                  {ds.name} ({ds.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  const ds = (datasetData?.items ?? []).find((d) => d.datasetId === datasetId);
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
                  <SelectValue placeholder="选择 Dataset" />
                </SelectTrigger>
                <SelectContent>
                  {(datasetData?.items ?? []).map((ds) => (
                    <SelectItem key={ds.datasetId} value={ds.datasetId}>
                      {ds.displayName}
                      {!ds.boundConfigId ? "（未绑定配置）" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              rows={6}
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
    </aside>
  );
}
