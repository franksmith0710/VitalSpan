import { Clock3, Frame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import {
  isScreenBorderWidget,
  isScreenClockWidget,
} from "@/lib/screenVisualAssets";
import { DeAttrField, DeAttrForm } from "@/components/dashboard/dashboardInspectorUi";
import { INSPECTOR_HINT } from "@/components/dashboard/inspectorCompact";
import { WidgetInspectorDelete } from "@/components/dashboard/widget-inspector-delete";
import { WidgetRailPanelHeader } from "@/components/dashboard/widgetRailChrome";

export type ScreenVisualEditRailProps = {
  widget: LayoutWidget & { textConfig: NonNullable<LayoutWidget["textConfig"]> };
  onTitleChange?: (title: string) => void;
  onDelete?: () => void;
  onRailCollapse?: () => void;
  className?: string;
};

export function ScreenVisualEditRail({
  widget,
  onTitleChange,
  onDelete,
  onRailCollapse,
  className,
}: ScreenVisualEditRailProps) {
  const isClock = isScreenClockWidget(widget);
  const isBorder = isScreenBorderWidget(widget);
  const kindLabel = isClock ? "时钟" : isBorder ? "边框" : "素材";
  const Icon = isClock ? Clock3 : Frame;

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col bg-white dark:bg-gray-900", className)}>
      <WidgetRailPanelHeader
        title={widget.title || kindLabel}
        subtitle={`素材 · ${kindLabel}`}
        onCollapse={onRailCollapse}
        collapseAriaLabel="收起配置"
      />
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
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
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 dark:border-cyan-500/25 dark:bg-cyan-500/10">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
              DataEase 素材组件
            </p>
            <p className={INSPECTOR_HINT}>
              {isClock
                ? "预览时自动显示日期时间与星期，内容不可编辑。"
                : "装饰边框叠加在画布上，请通过拖拽调整尺寸与位置。"}
            </p>
          </div>
        </div>
        {onDelete ? (
          <WidgetInspectorDelete onDelete={onDelete} className="mt-6" />
        ) : null}
      </div>
    </div>
  );
}
