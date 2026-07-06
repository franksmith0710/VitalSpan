import { useMemo } from "react";
import type { ReactNode } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LayoutWidget } from "./layoutUtils";
import { sortWidgets } from "./layoutUtils";
import {
  GRID_ROW_HEIGHT,
  gridLayoutToWidgets,
  widgetsToGridLayout,
} from "./gridLayoutAdapter";

const ResponsiveGridLayout = WidthProvider(Responsive);

export type DashboardGridMode = "edit" | "view";

type DashboardGridProps = {
  mode: DashboardGridMode;
  widgets: LayoutWidget[];
  renderWidget: (widget: LayoutWidget) => ReactNode;
  onAddWidget?: () => void;
  onLayoutChange?: (widgets: LayoutWidget[]) => void;
  className?: string;
};

const COL_SPAN_CLASS: Record<LayoutWidget["colSpan"], string> = {
  4: "xl:col-span-4",
  6: "xl:col-span-6",
  8: "xl:col-span-8",
  12: "xl:col-span-12",
};

export function DashboardGrid({
  mode,
  widgets,
  renderWidget,
  onAddWidget,
  onLayoutChange,
  className,
}: DashboardGridProps) {
  const sorted = sortWidgets(widgets);
  const gridLayout = useMemo(() => widgetsToGridLayout(sorted), [sorted]);

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700",
          className,
        )}
      >
        <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">仪表板还没有组件</p>
        <p className="text-theme-xs text-gray-500">从左侧添加表格、折线图或柱状图</p>
        {mode === "edit" && onAddWidget ? (
          <Button type="button" variant="primary" onClick={onAddWidget}>
            添加组件
          </Button>
        ) : null}
      </div>
    );
  }

  if (mode === "edit" && onLayoutChange) {
    return (
      <div className={cn("dashboard-grid-edit", className)}>
        <ResponsiveGridLayout
          className="layout"
          layouts={{ xl: gridLayout, lg: gridLayout, md: gridLayout, sm: gridLayout, xs: gridLayout }}
          cols={{ xl: 12, lg: 12, md: 12, sm: 6, xs: 4 }}
          rowHeight={GRID_ROW_HEIGHT}
          isDraggable
          isResizable
          draggableHandle=".dashboard-drag-handle"
          onLayoutChange={(layout) => onLayoutChange(gridLayoutToWidgets(layout, sorted))}
        >
          {sorted.map((widget) => (
            <div key={widget.id} className="min-w-0 overflow-hidden">
              {renderWidget(widget)}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12",
        mode === "edit" && "[&>*]:ring-1 [&>*]:ring-dashed [&>*]:ring-gray-200 dark:[&>*]:ring-gray-700",
        className,
      )}
    >
      {sorted.map((widget) => (
        <div
          key={widget.id}
          className={cn(
            "min-w-0 overflow-hidden",
            COL_SPAN_CLASS[widget.colSpan],
            widget.rowSpan > 1 && "min-h-[280px]",
          )}
        >
          {renderWidget(widget)}
        </div>
      ))}
    </div>
  );
}
