import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { ReactGridLayout } from "react-grid-layout/legacy";
import type { Layout } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import { cn } from "@/lib/utils";
import type { ChartType } from "@/lib/chartViewConfig";
import {
  DEFAULT_WIDGET_COLSPAN,
  DEFAULT_WIDGET_ROWSPAN,
  isChartTypeDragEvent,
  readChartTypeFromDragEvent,
} from "@/lib/dashboardDnd";
import { DashboardCanvasEmpty } from "./DashboardCanvasEmpty";
import type { LayoutWidget } from "./layoutUtils";
import { sortWidgets } from "./layoutUtils";
import {
  GRID_ROW_HEIGHT,
  gridLayoutToWidgets,
  widgetsToGridLayout,
} from "./gridLayoutAdapter";
import { GRID_COLS, snapLayoutToGrid } from "./gridSnapUtils";

const EMPTY_CANVAS_MIN_HEIGHT = 480;
const GRID_MARGIN: [number, number] = [12, 12];
export type DashboardGridMode = "edit" | "view";

type DashboardGridProps = {
  mode: DashboardGridMode;
  widgets: LayoutWidget[];
  renderWidget: (widget: LayoutWidget) => ReactNode;
  onInsertChart?: (type: ChartType, at: { gridX: number; gridY: number }) => void;
  onLayoutChange?: (widgets: LayoutWidget[]) => void;
  className?: string;
};

function viewColSpan(widget: LayoutWidget): number {
  return Math.min(12, Math.max(1, Math.round(widget.colSpan)));
}

function layoutKey(items: Layout): string {
  return items.map((item) => `${item.i}:${item.x}:${item.y}:${item.w}:${item.h}`).join("|");
}

/** 指针坐标 → 12 列栅格落点（不依赖 RGL isDroppable，避免占位节点闪烁） */
function pointerToGridCell(
  clientX: number,
  clientY: number,
  container: DOMRect,
  width: number,
): { gridX: number; gridY: number } {
  const colWidth = (width - GRID_MARGIN[0] * (GRID_COLS + 1)) / GRID_COLS;
  const localX = clientX - container.left - GRID_MARGIN[0];
  const localY = clientY - container.top - GRID_MARGIN[1];
  const gridX = Math.max(
    0,
    Math.min(GRID_COLS - DEFAULT_WIDGET_COLSPAN, Math.floor(localX / (colWidth + GRID_MARGIN[0]))),
  );
  const rowStride = GRID_ROW_HEIGHT + GRID_MARGIN[1];
  const gridY = Math.max(0, Math.floor(localY / rowStride));
  return { gridX, gridY };
}

function useStableGridWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(800);
  const lastWidthRef = useRef(800);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const apply = (next: number) => {
      const rounded = Math.round(next);
      const safe = rounded > 0 ? rounded : 800;
      if (Math.abs(safe - lastWidthRef.current) <= 1) return;
      lastWidthRef.current = safe;
      setWidth(safe);
    };

    apply(node.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) apply(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export function DashboardGrid({
  mode,
  widgets,
  renderWidget,
  onInsertChart,
  onLayoutChange,
  className,
}: DashboardGridProps) {
  const sorted = sortWidgets(widgets);
  const derivedLayout = useMemo(() => widgetsToGridLayout(sorted), [sorted]);
  const derivedLayoutKey = useMemo(() => layoutKey(derivedLayout), [derivedLayout]);
  const [layout, setLayout] = useState<Layout>(derivedLayout);
  const interactingRef = useRef(false);
  const sortedRef = useRef(sorted);
  const layoutKeyRef = useRef(derivedLayoutKey);
  const [dragActive, setDragActive] = useState(false);
  const [snapGuidesVisible, setSnapGuidesVisible] = useState(false);
  const { ref: widthRef, width } = useStableGridWidth();
  sortedRef.current = sorted;

  useEffect(() => {
    if (interactingRef.current || layoutKeyRef.current === derivedLayoutKey) return;
    layoutKeyRef.current = derivedLayoutKey;
    setLayout(derivedLayout);
  }, [derivedLayout, derivedLayoutKey]);

  const persistLayout = useCallback(
    (next: Layout, snap = false) => {
      if (!onLayoutChange || next.length !== sortedRef.current.length) return;
      const resolved = snap ? snapLayoutToGrid(next) : next;
      layoutKeyRef.current = layoutKey(resolved);
      setLayout(resolved);
      onLayoutChange(gridLayoutToWidgets(resolved, sortedRef.current));
    },
    [onLayoutChange],
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!isChartTypeDragEvent(e)) return;
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!isChartTypeDragEvent(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (!isChartTypeDragEvent(e)) return;
    const related = e.relatedTarget;
    if (related instanceof Node && e.currentTarget.contains(related)) return;
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (!onInsertChart) return;
      const chartType = readChartTypeFromDragEvent(e);
      if (!chartType) return;
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const rect = e.currentTarget.getBoundingClientRect();
      const at = pointerToGridCell(e.clientX, e.clientY, rect, width);
      onInsertChart(chartType, at);
    },
    [onInsertChart, width],
  );

  if (mode === "edit" && onLayoutChange) {
    const isEmpty = sorted.length === 0;
    return (
      <div
        ref={widthRef}
        className={cn(
          "dashboard-grid-edit relative h-full min-h-[420px] w-full",
          dragActive && "dashboard-canvas-drop-active",
          className,
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isEmpty ? <DashboardCanvasEmpty dragActive={dragActive} /> : null}
        {snapGuidesVisible ? (
          <div className="dashboard-grid-snap-guides" aria-hidden>
            {Array.from({ length: GRID_COLS }, (_, i) => (
              <div key={i} />
            ))}
          </div>
        ) : null}
        <ReactGridLayout
          className={cn("layout", isEmpty && "dashboard-grid-empty")}
          width={width}
          layout={layout}
          cols={GRID_COLS}
          rowHeight={GRID_ROW_HEIGHT}
          margin={GRID_MARGIN}
          containerPadding={[0, 0]}
          compactType={null}
          preventCollision={false}
          autoSize
          isDraggable
          isResizable
          isDroppable={false}
          resizeHandles={["se"]}
          draggableHandle=".dashboard-drag-handle"
          draggableCancel=".dashboard-no-drag"
          useCSSTransforms={false}
          style={isEmpty ? { minHeight: EMPTY_CANVAS_MIN_HEIGHT } : undefined}
          onDragStart={() => {
            interactingRef.current = true;
            setSnapGuidesVisible(true);
          }}
          onDragStop={(nextLayout) => {
            interactingRef.current = false;
            setSnapGuidesVisible(false);
            persistLayout(nextLayout, true);
          }}
          onResizeStart={() => {
            interactingRef.current = true;
            setSnapGuidesVisible(true);
          }}
          onResizeStop={(nextLayout) => {
            interactingRef.current = false;
            setSnapGuidesVisible(false);
            persistLayout(nextLayout, true);
          }}
          onLayoutChange={(next) => {
            if (!interactingRef.current) return;
            setLayout(next);
          }}
        >
          {sorted.map((widget) => (
            <div key={widget.id} className="h-full min-w-0">
              {renderWidget(widget)}
            </div>
          ))}
        </ReactGridLayout>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-white/[0.02]",
          className,
        )}
      >
        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">暂无组件</p>
        <p className="max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">
          此看板尚未添加图表，请进入编辑模式配置。
        </p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12", className)}>
      {sorted.map((widget) => (
        <div
          key={widget.id}
          className="min-w-0 overflow-hidden"
          style={{
            gridColumn: `span ${viewColSpan(widget)}`,
            minHeight: widget.rowSpan > 1 ? `${widget.rowSpan * 120}px` : undefined,
          }}
        >
          {renderWidget(widget)}
        </div>
      ))}
    </div>
  );
}
