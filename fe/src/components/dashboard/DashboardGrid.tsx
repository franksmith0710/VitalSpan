import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import type { Layout } from "react-grid-layout/legacy";
import { cn } from "@/lib/utils";
import {
  DEFAULT_WIDGET_COLSPAN,
  isPaletteDragEvent,
  readPaletteDragPayload,
  type PaletteDragPayload,
} from "@/lib/dashboardDnd";
import { DashboardCanvasEmpty } from "./DashboardCanvasEmpty";
import {
  DASHBOARD_GRID_COLS,
  DASHBOARD_GRID_MARGIN,
  DASHBOARD_GRID_ROW_HEIGHT,
  DashboardRglCanvas,
} from "./dashboardGridRgl";
import type { LayoutWidget } from "./layoutUtils";
import { sortWidgets } from "./layoutUtils";
import { gridLayoutToWidgets, widgetsToGridLayout } from "./gridLayoutAdapter";
import { normalizeGridLayout } from "./gridSnapUtils";

const EMPTY_CANVAS_MIN_HEIGHT = 480;
export type DashboardGridMode = "edit" | "view";

type DashboardGridProps = {
  mode: DashboardGridMode;
  widgets: LayoutWidget[];
  renderWidget: (widget: LayoutWidget) => ReactNode;
  onInsertChart?: (type: PaletteDragPayload, at: { gridX: number; gridY: number }) => void;
  onLayoutChange?: (widgets: LayoutWidget[]) => void;
  className?: string;
};

function layoutKey(items: Layout): string {
  return items.map((item) => `${item.i}:${item.x}:${item.y}:${item.w}:${item.h}`).join("|");
}

/** 指针坐标 → 12 列栅格落点 */
function pointerToGridCell(
  clientX: number,
  clientY: number,
  container: DOMRect,
): { gridX: number; gridY: number } {
  const width = container.width;
  const colWidth = (width - DASHBOARD_GRID_MARGIN[0] * (DASHBOARD_GRID_COLS + 1)) / DASHBOARD_GRID_COLS;
  const localX = clientX - container.left - DASHBOARD_GRID_MARGIN[0];
  const localY = clientY - container.top - DASHBOARD_GRID_MARGIN[1];
  const gridX = Math.max(
    0,
    Math.min(
      DASHBOARD_GRID_COLS - DEFAULT_WIDGET_COLSPAN,
      Math.floor(localX / (colWidth + DASHBOARD_GRID_MARGIN[0])),
    ),
  );
  const rowStride = DASHBOARD_GRID_ROW_HEIGHT + DASHBOARD_GRID_MARGIN[1];
  const gridY = Math.max(0, Math.floor(localY / rowStride));
  return { gridX, gridY };
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
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const viewLayout = useMemo(() => normalizeGridLayout(derivedLayout), [derivedLayout]);
  sortedRef.current = sorted;

  useEffect(() => {
    if (interactingRef.current || layoutKeyRef.current === derivedLayoutKey) return;
    layoutKeyRef.current = derivedLayoutKey;
    setLayout(derivedLayout);
  }, [derivedLayout, derivedLayoutKey]);

  const persistLayout = useCallback(
    (next: Layout, snap = false) => {
      if (!onLayoutChange || next.length !== sortedRef.current.length) return;
      const resolved = snap ? normalizeGridLayout(next) : next;
      layoutKeyRef.current = layoutKey(resolved);
      setLayout(resolved);
      onLayoutChange(gridLayoutToWidgets(resolved, sortedRef.current));
    },
    [onLayoutChange],
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!isPaletteDragEvent(e)) return;
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!isPaletteDragEvent(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (!isPaletteDragEvent(e)) return;
    const related = e.relatedTarget;
    if (related instanceof Node && e.currentTarget.contains(related)) return;
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (!onInsertChart) return;
      const payload = readPaletteDragPayload(e.nativeEvent);
      if (!payload) return;
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const rect = e.currentTarget.getBoundingClientRect();
      const at = pointerToGridCell(e.clientX, e.clientY, rect);
      onInsertChart(payload, at);
    },
    [onInsertChart],
  );

  const gridChildren = sorted.map((widget) => (
    <div key={widget.id} className="h-full min-w-0">
      {renderWidget(widget)}
    </div>
  ));

  if (mode === "edit" && onLayoutChange) {
    const isEmpty = sorted.length === 0;
    return (
      <div
        ref={canvasRef}
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
            {Array.from({ length: DASHBOARD_GRID_COLS }, (_, i) => (
              <div key={i} />
            ))}
          </div>
        ) : null}
        <DashboardRglCanvas
          className={cn("layout", isEmpty && "dashboard-grid-empty")}
          style={isEmpty ? { minHeight: EMPTY_CANVAS_MIN_HEIGHT } : undefined}
          layout={layout}
          editable
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
          {gridChildren}
        </DashboardRglCanvas>
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
    <div ref={canvasRef} className={cn("dashboard-grid-view relative w-full", className)}>
      <DashboardRglCanvas className="layout" layout={viewLayout} editable={false}>
        {gridChildren}
      </DashboardRglCanvas>
    </div>
  );
}
