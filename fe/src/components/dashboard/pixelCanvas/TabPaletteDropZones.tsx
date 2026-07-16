import type { DragEvent } from "react";
import { cn } from "@/lib/utils";
import { readPaletteDragPayload, type PaletteDragPayload } from "@/lib/dashboardDnd";
import type { PixelLayoutWidget } from "../layoutUtils";
import { widgetRect } from "./collisionLayout";

type TabPaletteDropZonesProps = {
  tabs: PixelLayoutWidget[];
  bufferPx: number;
  activeTabsId: string | null;
  onTabDrop: (tabsWidgetId: string, payload: PaletteDragPayload) => void;
};

function expandedOuter(
  widget: Pick<PixelLayoutWidget, "x" | "y" | "width" | "height">,
  bufferPx: number,
) {
  const inner = widgetRect(widget);
  const buffer = Math.max(0, bufferPx);
  return {
    inner,
    outer: {
      x: inner.x - buffer,
      y: inner.y - buffer,
      width: inner.width + buffer * 2,
      height: inner.height + buffer * 2,
    },
    buffer,
  };
}

/** Tab 专用投放区：外扩缓冲 + 可交互捕获（高于 shape，穿透邻组件） */
export function TabPaletteDropZones({
  tabs,
  bufferPx,
  activeTabsId,
  onTabDrop,
}: TabPaletteDropZonesProps) {
  if (tabs.length === 0 || bufferPx <= 0) return null;

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (tabsWidgetId: string) => (event: DragEvent) => {
    const payload = readPaletteDragPayload(event.nativeEvent);
    if (!payload) return;
    event.preventDefault();
    event.stopPropagation();
    onTabDrop(tabsWidgetId, payload);
  };

  return (
    <>
      {tabs.map((tab) => {
        const { inner, outer, buffer } = expandedOuter(tab, bufferPx);
        const active = tab.id === activeTabsId;
        return (
          <div
            key={tab.id}
            data-testid={`tab-palette-drop-zone-${tab.id}`}
            className="absolute z-[200]"
            style={{
              left: outer.x,
              top: outer.y,
              width: outer.width,
              height: outer.height,
            }}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDrop={handleDrop(tab.id)}
          >
            <div
              className={cn(
                "tab-palette-buffer-ring pointer-events-none absolute inset-0 rounded-sm border-2 border-dashed transition-colors",
                active
                  ? "border-brand-500 bg-brand-50/30 dark:border-brand-400 dark:bg-brand-500/12"
                  : "border-brand-400/50 bg-brand-50/12 dark:border-brand-500/35 dark:bg-brand-500/6",
              )}
              aria-hidden
            />
            {buffer > 0 ? (
              <div
                className="pointer-events-none absolute rounded-sm border border-dashed border-brand-300/40 dark:border-brand-500/30"
                style={{
                  left: buffer,
                  top: buffer,
                  width: inner.width,
                  height: inner.height,
                }}
                aria-hidden
              />
            ) : null}
            {active ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-center">
                <span className="tab-palette-buffer-label rounded-md bg-white/95 px-2 py-0.5 text-theme-xs font-medium text-brand-600 shadow-theme-xs dark:bg-gray-900/95 dark:text-brand-400">
                  释放加入页签
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
