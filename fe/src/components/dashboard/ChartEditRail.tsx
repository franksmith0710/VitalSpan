import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { LayoutWidget } from "./layoutUtils";
import { ChartInspectorProvider, useChartInspector } from "./ChartInspectorContext";
import { ChartEditorColumn } from "./ChartEditorColumn";
import { DatasetPickerPanel } from "./DatasetPickerPanel";
import { FieldBankPlaceholder } from "./DatasetFieldBank";
import { WidgetEditRailLayout } from "./WidgetEditRailLayout";

type ChartEditRailProps = {
  widget: LayoutWidget;
  onChange: (chartConfig: ChartViewConfig) => void;
  onTitleChange?: (title: string) => void;
  onDelete?: () => void;
  onOpenLinkage?: () => void;
  onDataRefresh?: () => void;
  className?: string;
};

function ChartDatasetRail() {
  const {
    widget,
    cfg,
    datasetsLoading,
    datasetsError,
    datasetItems,
    datasetsEmpty,
    handleDatasetSelect,
    columns,
    columnsLoading,
    columnsReady,
    assignField,
    refreshColumns,
  } = useChartInspector();

  return (
    <DatasetPickerPanel
      widgetId={widget.id}
      datasetId={cfg.datasetId}
      datasetsLoading={datasetsLoading}
      datasetsError={datasetsError}
      datasetsEmpty={datasetsEmpty}
      datasetItems={datasetItems}
      columns={columns}
      columnsLoading={columnsLoading}
      columnsReady={columnsReady}
      onDatasetSelect={handleDatasetSelect}
      onFieldClick={(field) => assignField(field)}
      onRefreshFields={refreshColumns}
    />
  );
}

/** DataEase chart-edit：左侧配置列 + 右侧数据集/字段（均可折叠） */
export function ChartEditRail({
  widget,
  onChange,
  onTitleChange,
  onDelete,
  onOpenLinkage,
  onDataRefresh,
  className,
}: ChartEditRailProps) {
  const cfg = widget.chartConfig;
  const title = widget.title || "图表";

  return (
    <ChartInspectorProvider widget={widget} onChange={onChange} onTitleChange={onTitleChange}>
      <WidgetEditRailLayout
        className={className}
        leftLabel={title}
        rightLabel="数据集"
        left={
          <ChartEditorColumn
            onDelete={onDelete}
            onOpenLinkage={onOpenLinkage}
            onDataRefresh={onDataRefresh}
            className="border-r border-gray-200 dark:border-gray-800"
          />
        }
        right={cfg ? <ChartDatasetRail /> : <FieldBankPlaceholder />}
      />
    </ChartInspectorProvider>
  );
}

export function ChartEditRailEmpty({ message, className }: { message: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center px-4 py-10 text-center",
        className,
      )}
    >
      {message}
    </div>
  );
}

export { FieldBankPlaceholder };
