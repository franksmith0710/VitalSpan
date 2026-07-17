import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import type { LayoutWidget, TextWidgetConfig } from "./layoutUtils";
import { ChartFieldSlot } from "./ChartFieldSlot";
import { ChartInspectorTabs } from "./ChartInspectorTabs";
import { DatasetFieldGroups } from "./DatasetFieldGroups";
import { DatasetSelector } from "./DatasetSelector";
import { DeAttrField, DeAttrForm, DE_INPUT } from "./dashboardInspectorUi";
import { INSPECTOR_HINT } from "./inspectorCompact";
import { textConfigToHtml } from "./richTextHtml";
import { useTextDatasetInspector } from "./useTextDatasetInspector";
import { WidgetInspectorDelete } from "./widget-inspector-delete";
import { TextWidgetStylePanel } from "./widgetRailStyleSections";
import { WidgetRailPanelHeader } from "./widgetRailChrome";

export type TextEditRailProps = {
  widget: LayoutWidget & { textConfig: TextWidgetConfig };
  onTitleChange?: (title: string) => void;
  onConfigChange?: (config: TextWidgetConfig) => void;
  onDelete?: () => void;
  onRailCollapse?: () => void;
  className?: string;
};

export function TextEditRail({
  widget,
  onTitleChange,
  onConfigChange,
  onDelete,
  onRailCollapse,
  className,
}: TextEditRailProps) {
  const textConfig = widget.textConfig;
  const queryClient = useQueryClient();
  const dataset = useTextDatasetInspector(textConfig, (next) => onConfigChange?.(next));
  const html = textConfigToHtml(textConfig);
  const document = new DOMParser().parseFromString(html, "text/html");
  const characters = (document.body.textContent ?? "").trim().length;
  const displayField = textConfig.metricField ?? textConfig.dimensionField;

  const refreshDatasets = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.datasets.list({ limit: 200, offset: 0 }),
    });
  };

  const assignField = (field: string) => {
    onConfigChange?.({
      ...textConfig,
      metricField: field,
      dimensionField: undefined,
    });
  };

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col bg-white dark:bg-gray-900", className)}>
      <WidgetRailPanelHeader
        title={widget.title || "富文本"}
        subtitle="富文本"
        onCollapse={onRailCollapse}
        collapseAriaLabel="收起配置"
      />

      <ChartInspectorTabs
        className="min-h-0 flex-1"
        defaultTab="data"
        tabs={["data", "style"]}
        data={
          <DeAttrForm>
            <DeAttrField label="数据集" compact>
              <DatasetSelector
                widgetId={widget.id}
                datasetId={textConfig.datasetId}
                datasetsLoading={dataset.datasetsLoading}
                datasetsError={dataset.datasetsError}
                datasetsEmpty={dataset.datasetsEmpty}
                datasetItems={dataset.datasetItems}
                onSelect={dataset.handleDatasetSelect}
                onRefresh={refreshDatasets}
              />
            </DeAttrField>
            {textConfig.datasetId ? (
              <ChartFieldSlot
                label="显示字段"
                fieldName={displayField}
                slotKind="metric"
                disabled={!textConfig.datasetId}
                onClear={
                  displayField
                    ? () =>
                        onConfigChange?.({
                          ...textConfig,
                          metricField: undefined,
                          dimensionField: undefined,
                        })
                    : undefined
                }
                onDropField={assignField}
              />
            ) : (
              <p className={cn(INSPECTOR_HINT, "border-b border-gray-100 px-3 pb-3 dark:border-white/[0.06]")}>
                选择数据集后可绑定字段作占位引用；正文在画布双击编辑。
              </p>
            )}
            <DatasetFieldGroups
              className="border-t border-gray-100 dark:border-white/[0.06]"
              columns={dataset.columns}
              columnsLoading={dataset.columnsLoading}
              columnsReady={dataset.columnsReady}
              datasetSelected={Boolean(textConfig.datasetId)}
              onFieldClick={assignField}
              onRefresh={dataset.refreshColumns}
            />
          </DeAttrForm>
        }
        style={
          <TextWidgetStylePanel
            widget={widget}
            characters={characters}
            widgetStyle={textConfig.widgetStyle ?? {}}
            onTitleChange={onTitleChange}
            onWidgetStyleChange={(patch) =>
              onConfigChange?.({
                ...textConfig,
                widgetStyle: { ...(textConfig.widgetStyle ?? {}), ...patch },
              })
            }
          />
        }
      />

      {onDelete ? (
        <div className="shrink-0 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
          <WidgetInspectorDelete widgetTitle={widget.title} onDelete={onDelete} embedded />
        </div>
      ) : null}
    </div>
  );
}
