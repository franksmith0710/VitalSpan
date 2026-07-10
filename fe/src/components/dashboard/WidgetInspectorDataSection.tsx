import { Link } from "react-router";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
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

type DataSourceListItem = { id: string; name: string; code: string };
type DatasetListItem = {
  datasetId: string;
  displayName: string;
  boundConfigId?: string | null;
};

const EMPTY_DATASET_VALUE = "__empty_datasets__";
const EMPTY_DATASOURCE_VALUE = "__empty_datasources__";

type WidgetInspectorDataSectionProps = {
  widgetId: string;
  cfg: ChartViewConfig;
  dataMode: "dataset" | "sql";
  dsLoading: boolean;
  datasetsLoading: boolean;
  datasetsError: boolean;
  datasourceItems: DataSourceListItem[];
  datasetItems: DatasetListItem[];
  datasetsEmpty: boolean;
  datasourcesEmpty: boolean;
  selectedDataset?: DatasetListItem;
  onChange: (chartConfig: ChartViewConfig) => void;
};

export function WidgetInspectorDataSection({
  widgetId,
  cfg,
  dataMode,
  dsLoading,
  datasetsLoading,
  datasetsError,
  datasourceItems,
  datasetItems,
  datasetsEmpty,
  datasourcesEmpty,
  selectedDataset,
  onChange,
}: WidgetInspectorDataSectionProps) {
  const setMode = (mode: "dataset" | "sql") => {
    if (mode === "sql") {
      onChange({ ...cfg, mode: "sql", datasetId: undefined, configId: undefined });
      return;
    }
    onChange({ ...cfg, mode: "dataset", sql: undefined });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`ds-${widgetId}`}>数据源</Label>
        <Select
          value={cfg.dataSourceId || undefined}
          onValueChange={(dataSourceId) => onChange({ ...cfg, dataSourceId })}
        >
          <SelectTrigger id={`ds-${widgetId}`} className="h-11">
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
        <TabsContent value="dataset" className="mt-3 grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor={`dataset-${widgetId}`}>Dataset</Label>
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
              <SelectTrigger id={`dataset-${widgetId}`} className="h-11">
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
        <TabsContent value="sql" className="mt-3 grid gap-2">
          <Label htmlFor={`sql-${widgetId}`}>SQL</Label>
          <textarea
            id={`sql-${widgetId}`}
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
  );
}
