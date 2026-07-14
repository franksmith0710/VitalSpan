import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayoutWidget, TextWidgetConfig } from "./layoutUtils";
import { ChartFieldSlot } from "./ChartFieldSlot";
import { ChartInspectorTabs } from "./ChartInspectorTabs";
import { DatasetPickerPanel } from "./DatasetPickerPanel";
import { textConfigToHtml } from "./richTextHtml";
import { useTextDatasetInspector } from "./useTextDatasetInspector";
import { WidgetAdvancedAccordion } from "./WidgetAdvancedAccordion";
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
  onAssignField: (field: string, target: "dimension" | "metric") => void;
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
        data={
          <div className="space-y-4">
            <ChartFieldSlot
              label="维度"
              fieldName={textConfig.dimensionField}
              disabled={!textConfig.datasetId}
              onClear={
                textConfig.dimensionField
                  ? () => onConfigChange?.({ ...textConfig, dimensionField: undefined })
                  : undefined
              }
              onDropField={(field) => onAssignField(field, "dimension")}
            />
            <ChartFieldSlot
              label="指标"
              fieldName={textConfig.metricField}
              disabled={!textConfig.datasetId}
              onClear={
                textConfig.metricField
                  ? () => onConfigChange?.({ ...textConfig, metricField: undefined })
                  : undefined
              }
              onDropField={(field) => onAssignField(field, "metric")}
            />
            <div className="space-y-1.5">
              <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                过滤器
              </span>
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-2 text-theme-xs text-gray-400 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-500">
                富文本不使用图表过滤器
              </div>
            </div>
            <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
              从右侧数据集拖入字段；引用时仅展示首条结果值（对标 DataEase）。
            </p>
          </div>
        }
        style={
          <div className="space-y-4">
            {onTitleChange ? (
              <div className="space-y-1.5">
                <Label htmlFor={`text-title-${widget.id}`}>组件名称</Label>
                <Input
                  id={`text-title-${widget.id}`}
                  value={widget.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="h-10"
                />
              </div>
            ) : null}
            <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-white/[0.03]">
              <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                文字样式
              </p>
              <p className="mt-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                在画布中双击进入编辑，使用浮动工具栏调整字体、字号、颜色与对齐。
              </p>
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                当前内容：{characters} 个字符
              </p>
            </div>
          </div>
        }
        advanced={
          <WidgetAdvancedAccordion
            sections={[
              {
                id: "feature",
                title: "功能设置",
                defaultOpen: true,
                content: (
                  <p className="leading-relaxed">
                    双击画布编辑正文；点击外部或 Ctrl+Enter 保存，Esc 取消。
                  </p>
                ),
              },
              {
                id: "guide",
                title: "辅助线",
                content: <p>富文本组件不支持辅助线。</p>,
              },
              {
                id: "conditional",
                title: "条件样式",
                content: <p>富文本组件不支持条件样式。</p>,
              },
              {
                id: "linkage",
                title: "联动设置",
                disabled: true,
                content: <p>富文本组件不支持联动（对标 DataEase）。</p>,
              },
              {
                id: "jump",
                title: "跳转设置",
                disabled: true,
                content: <p>富文本组件不支持跳转（对标 DataEase）。</p>,
              },
            ]}
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
          onAssignField={dataset.assignField}
          className="border-r border-gray-200 dark:border-gray-800"
        />
      }
      right={
        <DatasetPickerPanel
          widgetId={widget.id}
          variant="text"
          datasetId={textConfig.datasetId}
          datasetsLoading={dataset.datasetsLoading}
          datasetsError={dataset.datasetsError}
          datasetsEmpty={dataset.datasetsEmpty}
          datasetItems={dataset.datasetItems}
          columns={dataset.columns}
          columnsLoading={dataset.columnsLoading}
          columnsReady={dataset.columnsReady}
          onDatasetSelect={dataset.handleDatasetSelect}
          onFieldClick={(field) => {
            if (!textConfig.dimensionField) {
              dataset.assignField(field, "dimension");
              return;
            }
            dataset.assignField(field, "metric");
          }}
          onRefreshFields={dataset.refreshColumns}
        />
      }
    />
  );
}
