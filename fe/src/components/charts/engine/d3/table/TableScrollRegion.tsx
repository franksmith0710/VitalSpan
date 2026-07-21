import { type CSSProperties, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTableScrollEdges } from "@/components/charts/engine/d3/table/useTableScrollEdges";

type TableScrollRegionProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  edgeDeps?: unknown[];
};

/** 表格滚动区：细滚动条 + 四向滚动渐隐提示（对标 DE 冻结/横向浏览） */
export function TableScrollRegion({ children, className, style, edgeDeps = [] }: TableScrollRegionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const edges = useTableScrollEdges(scrollRef, edgeDeps);

  return (
    <div
      ref={scrollRef}
      className={cn(
        "vs-table-scroll dashboard-scroll relative min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain",
        className,
      )}
      style={style}
      data-scroll-left={edges.left ? "" : undefined}
      data-scroll-right={edges.right ? "" : undefined}
      data-scroll-top={edges.top ? "" : undefined}
      data-scroll-bottom={edges.bottom ? "" : undefined}
    >
      {children}
    </div>
  );
}
