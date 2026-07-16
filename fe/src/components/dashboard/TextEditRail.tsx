import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayoutWidget, TextWidgetConfig } from "./layoutUtils";
import { ChartFieldSlot } from "./ChartFieldSlot";
import { ChartInspectorTabs } from "./ChartInspectorTabs";
import { DatasetPickerPanel } from "./DatasetPickerPanel";
import { INSPECTOR_HINT } from "./inspectorCompact";
import { textConfigToHtml } from "./richTextHtml";
import { useTextDatasetInspector } from "./useTextDatasetInspector";
import { WidgetEditRailLayout } from "./WidgetEditRailLayout";
import { WidgetInspectorDelete } from "./widget-inspector-delete";

type TextEditRailProps = {
  widget: LayoutWidget & { textConfig: TextWidgetConfig };
  onTitleChange?: (title: string) => void;
  onConfigChange?: (config: TextWidgetConfig) => void;
  onDelete?: () => void;
  className?: string;
};

type TextEditorColumnProps = TextEditRailProps & {
  onAssignField: (field: string) => void;
};

function TextEditorColumn({
  widget,
  onTitleChange,
  onConfigChange,
  onDelete,
  onAssignField,
  className,
}: TextEditorColumnProps) {
  const textConfig = widget.textConfig;
  const html = textConfigToHtml(textConfig);
  const document = new DOMParser().parseFromString(html, "text/html");
  const characters = (document.body.textContent ?? "").trim().length;
  const displayField = textConfig.metricField ?? textConfig.dimensionField;

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-white dark:bg-gray-900", className)}>
      <div className="shrink-0 border-b border-gray-200 px-3 py-2.5 dark:border-gray-800">
        <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {widget.title}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">富文本</p>
      </div>

      <ChartInspectorTabs
        className="min-h-0 flex-1"
        defaultTab="data"
        tabs={["data", "style"]}
        data={
          <div className="space-y-3">
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
                onDropField={onAssignField}
              />
            ) : (
              <p className={INSPECTOR_HINT}>
                先在右侧选择数据集，再拖入字段；正文以静态富文本为主（对标 DataEase 文本卡）。
              </p>
            )}
            {textConfig.datasetId ? (
              <p className={INSPECTOR_HINT}>
                绑定字段后取首条结果值作占位引用；双击画布编辑正文样式与内容。
              </p>
            ) : null}
          </div>
        }
        style={
          <div className="space-y-3">
            {onTitleChange ? (
              <div className="space-y-1.5">
                <Label htmlFor={`text-title-${widget.id}`} className="text-[11px] font-medium text-gray-500">
                  组件名称
                </Label>
                <Input
                  id={`text-title-${widget.id}`}
                  value={widget.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="h-8 rounded-md text-theme-xs"
                />
              </div>
            ) : null}
            <div className="rounded-md border border-gray-200 bg-gray-50/60 p-2.5 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-[11px] font-medium text-gray-800 dark:text-white/90">文字样式</p>
              <p className="mt-1 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
                双击画布进入编辑，使用浮动工具栏调整字体、字号、颜色与对齐。
              </p>
              <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                当前内容：{characters} 个字符
              </p>
              <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                保存：点击外部或 Ctrl+Enter；取消：Esc
              </p>
            </div>
          </div>
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

/** DataEase chart-edit：富文本配置列 + 数据集字段库双列（均可折叠） */
export function TextEditRail({
  widget,
  onTitleChange,
  onConfigChange,
  onDelete,
  className,
}: TextEditRailProps) {
  const textConfig = widget.textConfig;
  const dataset = useTextDatasetInspector(textConfig, (next) => onConfigChange?.(next));

  const assignDisplayField = (field: string) => {
    onConfigChange?.({
      ...textConfig,
      metricField: field,
      dimensionField: undefined,
    });
  };

  return (
    <WidgetEditRailLayout
      className={className}
      leftLabel={widget.title || "富文本"}
      rightLabel="数据集"
      left={
        <TextEditorColumn
          widget={widget}
          onTitleChange={onTitleChange}
          onConfigChange={onConfigChange}
          onDelete={onDelete}
          onAssignField={assignDisplayField}
          className="border-r border-gray-200 dark:border-gray-800"
        />
      }
      right={
        <DatasetPickerPanel
          widgetId={widget.id}
          datasetId={textConfig.datasetId}
          datasetsLoading={dataset.datasetsLoading}
          datasetsError={dataset.datasetsError}
          datasetsEmpty={dataset.datasetsEmpty}
          datasetItems={dataset.datasetItems}
          columns={dataset.columns}
          columnsLoading={dataset.columnsLoading}
          columnsReady={dataset.columnsReady}
          onDatasetSelect={dataset.handleDatasetSelect}
          onFieldClick={assignDisplayField}
          onRefreshFields={dataset.refreshColumns}
        />
      }
    />
  );
}
