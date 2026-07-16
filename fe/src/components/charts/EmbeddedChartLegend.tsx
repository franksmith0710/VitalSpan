import type { ReactNode } from "react";
import type { ChartLegendStyle } from "@/lib/chartDeStyle";
import { cn } from "@/lib/utils";

export type ChartLegendItem = { name: string; color: string };

/** 横向图例最多可见行数，超出滚动，避免挤压/遮盖绘图区 */
const HORIZONTAL_LEGEND_MAX_ROWS = 3;
const VERTICAL_LEGEND_MAX_WIDTH_REM = 6.5;

/** 按字号估算横向图例最大高度（px） */
export function legendShellMaxHeightPx(fontSize: number, maxRows = HORIZONTAL_LEGEND_MAX_ROWS): number {
  const lineHeight = 1.3;
  const rowGap = 4;
  const paddingY = 8;
  return Math.ceil(fontSize * lineHeight * maxRows + rowGap * (maxRows - 1) + paddingY);
}

type EmbeddedChartLegendProps = {
  items: ChartLegendItem[];
  fontSize?: number;
  position: NonNullable<ChartLegendStyle["position"]>;
};

function EmbeddedChartLegend({ items, fontSize = 12, position }: EmbeddedChartLegendProps) {
  if (items.length === 0) return null;
  const horizontal = position === "top" || position === "bottom";

  return (
    <ul
      className={cn(
        "dashboard-chart-legend pointer-events-none shrink-0 gap-x-3 gap-y-1 overflow-auto px-2 py-1",
        horizontal
          ? "flex w-full flex-row flex-wrap items-center justify-center"
          : "flex max-h-full flex-col justify-center",
      )}
      style={{
        fontSize: `${fontSize}px`,
        ...(horizontal
          ? { maxHeight: `${legendShellMaxHeightPx(fontSize)}px` }
          : { maxWidth: `${VERTICAL_LEGEND_MAX_WIDTH_REM}rem` }),
      }}
      aria-label="图例"
    >
      {items.map((item) => (
        <li key={item.name} className="flex max-w-full items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="truncate leading-tight text-[var(--dashboard-text-muted,#667085)]">
            {item.name}
          </span>
        </li>
      ))}
    </ul>
  );
}

type EmbeddedChartLegendShellProps = {
  position: NonNullable<ChartLegendStyle["position"]>;
  fontSize?: number;
  items: ChartLegendItem[];
  children: ReactNode;
};

/** 看板内嵌：图例贴在组件外框 pixel-shape-inner（含标题区），flex 分区不叠在图表上 */
export function EmbeddedChartLegendShell({
  position,
  fontSize,
  items,
  children,
}: EmbeddedChartLegendShellProps) {
  const legend = <EmbeddedChartLegend items={items} fontSize={fontSize} position={position} />;
  const horizontal = position === "top" || position === "bottom";
  const chartArea = (
    <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 overflow-hidden",
        horizontal ? "flex-col" : "flex-row",
      )}
    >
      {position === "top" || position === "left" ? legend : null}
      {chartArea}
      {position === "bottom" || position === "right" ? legend : null}
    </div>
  );
}
