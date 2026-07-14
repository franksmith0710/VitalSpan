import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import { DatasetFieldGroups } from "./DatasetFieldGroups";
import { DatasetSelector } from "./DatasetSelector";
import { RailFoldIcon } from "./RailFoldTab";
import { useWidgetEditRailRightCollapse } from "./WidgetEditRailLayout";

export type DatasetListItem = {
  datasetId: string;
  displayName: string;
  boundConfigId?: string | null;
};

type DatasetPickerPanelProps = {
  widgetId: string;
  datasetId?: string;
  datasetsLoading: boolean;
  datasetsError: boolean;
  datasetsEmpty: boolean;
  datasetItems: DatasetListItem[];
  columns: string[];
  columnsLoading: boolean;
  columnsReady: boolean;
  onDatasetSelect: (datasetId: string) => void;
  onFieldClick?: (fieldName: string) => void;
  onRefreshFields?: () => void;
  className?: string;
};

/** DataEase `dataset-main-top`：数据集选择 + 字段（维度/指标），无工程向就绪检查条。 */
export function DatasetPickerPanel({
  widgetId,
  datasetId,
  datasetsLoading,
  datasetsError,
  datasetsEmpty,
  datasetItems,
  columns,
  columnsLoading,
  columnsReady,
  onDatasetSelect,
  onFieldClick,
  onRefreshFields,
  className,
}: DatasetPickerPanelProps) {
  const queryClient = useQueryClient();
  const collapseRail = useWidgetEditRailRightCollapse();
  const refreshDatasets = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.datasets.list({ limit: 200, offset: 0 }),
    });
  };

  const fieldsReady = Boolean(datasetId);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col bg-gray-50/50 dark:bg-white/[0.02]",
        className,
      )}
    >
      <div className="shrink-0 border-b border-gray-200 px-3 py-2.5 dark:border-gray-800">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-theme-xs font-semibold text-gray-800 dark:text-white/90">数据集</h3>
          {collapseRail ? (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 text-gray-400 hover:bg-white hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
              aria-label="收起数据集"
              onClick={collapseRail}
            >
              <RailFoldIcon />
            </IconButton>
          ) : null}
        </div>
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
          <p className="mt-2 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
            请先在{" "}
            <Link to="/admin/datasets" className="text-brand-600 underline dark:text-brand-400">
              数据集管理
            </Link>{" "}
            中创建。
          </p>
        ) : null}
      </div>

      <main className="dataset-main-top flex min-h-0 min-w-0 flex-1 flex-col" aria-label="字段库">
        <DatasetFieldGroups
          columns={columns}
          columnsLoading={columnsLoading}
          columnsReady={columnsReady}
          datasetSelected={fieldsReady}
          onFieldClick={onFieldClick}
          onRefresh={onRefreshFields}
        />
      </main>
    </div>
  );
}
