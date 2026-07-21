import { cn } from "@/lib/utils";

type TableResizeHandleProps = {
  orientation: "column" | "row";
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  className?: string;
};

/** AntV S2 风格行列拖拽手柄 */
export function TableResizeHandle({ orientation, onPointerDown, className }: TableResizeHandleProps) {
  const isColumn = orientation === "column";
  return (
    <div
      role="separator"
      aria-orientation={isColumn ? "vertical" : "horizontal"}
      aria-label={isColumn ? "调整列宽" : "调整行高"}
      data-pixel-no-drag="true"
      className={cn(
        "vs-table-resize-handle absolute z-20 touch-none",
        isColumn
          ? "top-0 -right-1 h-full w-2 cursor-col-resize"
          : "bottom-0 left-0 h-2 w-full cursor-row-resize",
        "opacity-0 transition-opacity group-hover/th:opacity-100 hover:opacity-100",
        className,
      )}
      onPointerDown={onPointerDown}
    >
      <span
        className={cn(
          "pointer-events-none absolute bg-brand-500/70",
          isColumn ? "top-2 bottom-2 right-[3px] w-0.5" : "left-2 right-2 bottom-[3px] h-0.5",
        )}
      />
    </div>
  );
}
