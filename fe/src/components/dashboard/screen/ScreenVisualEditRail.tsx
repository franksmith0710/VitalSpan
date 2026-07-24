import { CalendarClock, Circle, Clock3, Frame, Minus, Shapes } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayoutWidget, TextWidgetConfig } from "@/components/dashboard/layoutUtils";
import {
  isScreenBorderWidget,
  isScreenClockWidget,
  isScreenDateTimeWidget,
  isScreenIconWidget,
  isScreenShapeWidget,
  isScreenTitleBarWidget,
} from "@/lib/screenVisualAssets";
import { DeAttrField, DeAttrForm } from "@/components/dashboard/dashboardInspectorUi";
import { INSPECTOR_HINT } from "@/components/dashboard/inspectorCompact";
import { WidgetInspectorDelete } from "@/components/dashboard/widget-inspector-delete";
import { WidgetRailPanelHeader } from "@/components/dashboard/widgetRailChrome";
import {
  ScreenIconStylePanel,
  ScreenShapeStylePanel,
} from "./ScreenMaterialStylePanels";
import {
  patchScreenVisualStyle,
  ScreenBorderStylePanel,
  ScreenClockStylePanel,
  ScreenDateTimeStylePanel,
  ScreenTitleBarStylePanel,
} from "./ScreenVisualStylePanels";

export type ScreenVisualEditRailProps = {
  widget: LayoutWidget & { textConfig: NonNullable<LayoutWidget["textConfig"]> };
  onTitleChange?: (title: string) => void;
  onTextConfigChange?: (config: TextWidgetConfig) => void;
  onDelete?: () => void;
  onRailCollapse?: () => void;
  className?: string;
};

export function ScreenVisualEditRail({
  widget,
  onTitleChange,
  onTextConfigChange,
  onDelete,
  onRailCollapse,
  className,
}: ScreenVisualEditRailProps) {
  const isClock = isScreenClockWidget(widget);
  const isBorder = isScreenBorderWidget(widget);
  const isTitleBar = isScreenTitleBarWidget(widget);
  const isDateTime = isScreenDateTimeWidget(widget);
  const isShape = isScreenShapeWidget(widget);
  const isIcon = isScreenIconWidget(widget);
  const kindLabel = isClock
    ? "时钟"
    : isBorder
      ? "边框"
      : isTitleBar
        ? "标题装饰"
        : isDateTime
          ? "日期时间"
          : isShape
            ? "图形"
            : isIcon
              ? "图标"
              : "素材";
  const Icon = isClock
    ? Clock3
    : isBorder
      ? Frame
      : isDateTime
        ? CalendarClock
        : isShape
          ? Shapes
          : isIcon
            ? Circle
            : Minus;
  const screenStyle = widget.textConfig.screenStyle ?? {};

  const patchStyle = (
    key: "clock" | "datetime" | "border" | "titleBar" | "shape" | "icon",
    partial: object,
  ) => {
    onTextConfigChange?.({
      ...widget.textConfig,
      screenStyle: patchScreenVisualStyle(screenStyle, key, partial),
    });
  };

  const hintText = isClock
    ? "预览时自动显示日期时间与星期，内容不可编辑。"
    : isDateTime
      ? "上下分行展示日期与时间，可在下方调整字号与颜色。"
      : isTitleBar
        ? "顶部标题装饰条，标题取自图层名称。"
        : isShape
          ? "基础几何图形装饰，可调整描边与填充。"
          : isIcon
            ? "线框图标装饰，可调整颜色与尺寸。"
            : "装饰边框叠加在画布上，请通过拖拽调整尺寸与位置。";

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col bg-white dark:bg-gray-900", className)}>
      <WidgetRailPanelHeader
        title={widget.title || kindLabel}
        subtitle={`素材 · ${kindLabel}`}
        onCollapse={onRailCollapse}
        collapseAriaLabel="收起配置"
      />

      <div className="flex shrink-0 items-start gap-3 border-b border-gray-100 px-3 py-2.5 dark:border-white/[0.06]">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
          <Icon className="size-4" aria-hidden />
        </span>
        <p className={cn(INSPECTOR_HINT, "min-w-0 pt-0.5")}>{hintText}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain no-scrollbar px-2 py-1.5">
        <div className="p-2">
          <DeAttrForm>
            <DeAttrField label="图层名称" compact>
              <Input
                value={widget.title}
                onChange={(e) => onTitleChange?.(e.target.value)}
                className="h-9"
                placeholder={kindLabel}
              />
            </DeAttrField>
          </DeAttrForm>

          {isClock ? (
            <ScreenClockStylePanel
              value={screenStyle.clock}
              onChange={(clock) => patchStyle("clock", clock)}
            />
          ) : isDateTime ? (
            <ScreenDateTimeStylePanel
              value={screenStyle.datetime}
              onChange={(datetime) => patchStyle("datetime", datetime)}
            />
          ) : isBorder ? (
            <ScreenBorderStylePanel
              value={screenStyle.border}
              onChange={(border) => patchStyle("border", border)}
            />
          ) : isTitleBar ? (
            <ScreenTitleBarStylePanel
              value={screenStyle.titleBar}
              onChange={(titleBar) => patchStyle("titleBar", titleBar)}
            />
          ) : isShape ? (
            <ScreenShapeStylePanel
              value={screenStyle.shape}
              onChange={(shape) => patchStyle("shape", shape)}
            />
          ) : isIcon ? (
            <ScreenIconStylePanel
              value={screenStyle.icon}
              onChange={(icon) => patchStyle("icon", icon)}
            />
          ) : null}
        </div>
      </div>

      {onDelete ? (
        <div className="shrink-0 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
          <WidgetInspectorDelete widgetTitle={widget.title} onDelete={onDelete} embedded />
        </div>
      ) : null}
    </div>
  );
}
