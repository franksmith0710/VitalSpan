import type { PointerEvent } from "react";
import { cn } from "@/lib/utils";

type WidgetEditRailResizeHandleProps = {
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  className?: string;
};

/** 图表编辑双列之间的拖拽分隔条 */
export function WidgetEditRailResizeHandle({
  onPointerDown,
  className,
}: WidgetEditRailResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="调整配置与数据集列宽"
      tabIndex={0}
      onPointerDown={onPointerDown}
      className={cn(
        "group relative z-[2] h-full shrink-0 cursor-col-resize touch-none select-none",
        "bg-gray-200/80 hover:bg-brand-200/80 dark:bg-gray-800 dark:hover:bg-brand-500/25",
        className,
      )}
      data-testid="widget-edit-rail-resize-handle"
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-300 group-hover:bg-brand-400 dark:bg-gray-700 dark:group-hover:bg-brand-400"
        aria-hidden
      />
    </div>
  );
}
