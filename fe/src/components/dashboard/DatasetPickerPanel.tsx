import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import { ChartSqlBindingForm } from "./ChartSqlBindingForm";
import { DatasetBindingAlerts } from "./DatasetReadinessChecklist";
import { DatasetFieldGroups } from "./DatasetFieldGroups";
import { DatasetSelector } from "./DatasetSelector";

export type DatasetListItem = {
  datasetId: string;
  displayName: string;
  boundConfigId?: string | null;
};

type DataSourceListItem = { id: string; name: string; code: string };

type DatasetPickerPanelProps = {
  widgetId: string;
  variant?: "chart" | "text";
  dataMode?: "dataset" | "sql";
  datasetId?: string;
  datasetsLoading: boolean;
  datasetsError: boolean;
  datasetsEmpty: boolean;
  datasetItems: DatasetListItem[];
  columns: string[];
  columnsLoading: boolean;
  columnsReady: boolean;
  hasBoundConfig?: boolean;
  hasSyncedConfig?: boolean;
  onDatasetSelect: (datasetId: string) => void;
  onFieldClick?: (fieldName: string) => void;
  onRefreshFields?: () => void;
  chartConfig?: ChartViewConfig;
  onChartConfigChange?: (chartConfig: ChartViewConfig) => void;
  dsLoading?: boolean;
  datasourceItems?: DataSourceListItem[];
  datasourcesEmpty?: boolean;
  className?: string;
};

/** DataEase chart-edit 右列：数据集 | 字段 */
export function DatasetPickerPanel({
  widgetId,
  variant = "chart",
  dataMode = "dataset",
  datasetId,
  datasetsLoading,
  datasetsError,
  datasetsEmpty,
  datasetItems,
  columns,
  columnsLoading,
  columnsReady,
  hasBoundConfig = true,
  hasSyncedConfig = false,
  onDatasetSelect,
  onFieldClick,
  onRefreshFields,
  chartConfig,
  onChartConfigChange,
  dsLoading = false,
  datasourceItems = [],
  datasourcesEmpty = false,
  className,
}: DatasetPickerPanelProps) {
  const queryClient = useQueryClient();
  const [rightTab, setRightTab] = useState<"dataset" | "fields">("dataset");

  const refreshDatasets = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.datasets.list({ limit: 200, offset: 0 }),
    });
  };

  const setBindingMode = (mode: "dataset" | "sql") => {
    if (!chartConfig || !onChartConfigChange) return;
    if (mode === "sql") {
      onChartConfigChange({
        ...chartConfig,
        mode: "sql",
        datasetId: undefined,
        configId: undefined,
      });
      return;
    }
    onChartConfigChange({ ...chartConfig, mode: "dataset", sql: undefined });
  };

  const fieldsReady = dataMode === "sql" ? columnsReady : Boolean(datasetId);

  const datasetBody = (
    <div className="space-y-2">
      {variant === "chart" && chartConfig && onChartConfigChange ? (
        <Tabs value={dataMode} onValueChange={(v) => setBindingMode(v as "dataset" | "sql")}>
          <TabsList className="grid h-8 w-full grid-cols-2">
            <TabsTrigger value="dataset" className="text-[11px]">
              选择数据集
            </TabsTrigger>
            <TabsTrigger value="sql" className="text-[11px]">
              高级 SQL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dataset" className="mt-2 space-y-2">
            <DatasetSelector
              widgetId={widgetId}
              datasetId={datasetId}
              datasetsLoading={datasetsLoading}
              datasetsError={datasetsError}
              datasetsEmpty={datasetsEmpty}
              datasetItems={datasetItems}
              onSelect={onDatasetSelect}
              onRefresh={refreshDatasets}
            />
            {datasetsEmpty ? (
              <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                请先在{" "}
                <Link to="/admin/datasets" className="text-brand-600 underline dark:text-brand-400">
                  数据集管理
                </Link>{" "}
                中创建。
              </p>
            ) : null}
            <DatasetBindingAlerts
              dataMode="dataset"
              hasDataset={Boolean(datasetId)}
              hasBoundConfig={hasBoundConfig}
              hasSyncedConfig={hasSyncedConfig}
              columnsLoaded={columns.length > 0}
            />
          </TabsContent>
          <TabsContent value="sql" className="mt-2">
            <ChartSqlBindingForm
              widgetId={widgetId}
              cfg={chartConfig}
              dsLoading={dsLoading}
              datasourceItems={datasourceItems}
              datasourcesEmpty={datasourcesEmpty}
              onChange={onChartConfigChange}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <DatasetSelector
            widgetId={widgetId}
            datasetId={datasetId}
            datasetsLoading={datasetsLoading}
            datasetsError={datasetsError}
            datasetsEmpty={datasetsEmpty}
            datasetItems={datasetItems}
            onSelect={onDatasetSelect}
            onRefresh={refreshDatasets}
          />
          {datasetsEmpty ? (
            <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
              请先在{" "}
              <Link to="/admin/datasets" className="text-brand-600 underline dark:text-brand-400">
                数据集管理
              </Link>{" "}
              中创建。
            </p>
          ) : null}
          <DatasetBindingAlerts
            dataMode="dataset"
            hasDataset={Boolean(datasetId)}
            hasBoundConfig={hasBoundConfig}
            hasSyncedConfig={hasSyncedConfig}
            columnsLoaded={columns.length > 0}
          />
        </>
      )}
    </div>
  );

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col bg-gray-50/50 dark:bg-white/[0.02]", className)}>
      <Tabs
        value={rightTab}
        onValueChange={(v) => setRightTab(v as "dataset" | "fields")}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-3 mt-2 grid h-9 w-[calc(100%-1.5rem)] shrink-0 grid-cols-2">
          <TabsTrigger value="dataset" className="text-theme-xs">
            数据集
          </TabsTrigger>
          <TabsTrigger value="fields" className="text-theme-xs">
            字段
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="dataset"
          className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-3 data-[state=inactive]:hidden"
        >
          {datasetBody}
        </TabsContent>
        <TabsContent
          value="fields"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <DatasetFieldGroups
            columns={columns}
            columnsLoading={columnsLoading}
            columnsReady={columnsReady}
            datasetSelected={fieldsReady}
            onFieldClick={onFieldClick}
            onRefresh={onRefreshFields}
            showHeader={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
