import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChartLegendIconShape, ChartLegendStyle } from "@/lib/chartDeStyle";
import {
  EMBEDDED_SIDE_LEGEND_MAX_WIDTH,
  legendMarkerStyle,
  legendSideAlignClass,
  legendStripJustifyClass,
  readChartLegendHAlign,
  readChartLegendIcon,
  readChartLegendIconSize,
  readChartLegendOrient,
  readChartLegendVAlign,
  resolveEmbeddedLegendOrient,
  type ChartLegendHAlign,
  type ChartLegendVAlign,
} from "@/lib/chartLegendPresentation";
import { cn } from "@/lib/utils";

export type ChartLegendItem = { name: string; color: string };

/** 横向图例最多可见行数，超出滚动，避免挤压/遮盖绘图区 */
const HORIZONTAL_LEGEND_MAX_ROWS = 3;

/** 横向图例每页最多展示项数（超出分页） */
export const HORIZONTAL_LEGEND_ITEMS_PER_PAGE = 8;

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
  orient?: NonNullable<ChartLegendStyle["orient"]>;
  hAlign?: ChartLegendHAlign;
  vAlign?: ChartLegendVAlign;
  icon?: ChartLegendIconShape;
  iconSize?: number;
  textColor?: string;
  page: number;
  onPageChange: (page: number) => void;
};

function EmbeddedChartLegend({
  items,
  fontSize = 12,
  position,
  orient = "horizontal",
  hAlign = "center",
  vAlign = "bottom",
  icon = "triangle",
  iconSize = 6,
  textColor,
  page,
  onPageChange,
}: EmbeddedChartLegendProps) {
  if (items.length === 0) return null;

  const layoutOrient = resolveEmbeddedLegendOrient(position, orient);
  const horizontal = layoutOrient === "horizontal";
  const sideSlot = position === "left" || position === "right";
  const pageSize = horizontal ? HORIZONTAL_LEGEND_ITEMS_PER_PAGE : items.length;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleItems = items.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="flex min-w-0 flex-col">
      <ul
        className={cn(
          "dashboard-chart-legend pointer-events-none shrink-0 gap-x-2 gap-y-0.5 px-1.5 py-1",
          horizontal
            ? cn(
                "flex w-full flex-row flex-wrap items-center overflow-x-auto overflow-y-auto",
                legendStripJustifyClass(hAlign),
              )
            : cn("flex max-h-full w-full flex-col overflow-y-auto", sideSlot && legendSideAlignClass(vAlign)),
        )}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.35,
          ...(horizontal
            ? { maxHeight: `${legendShellMaxHeightPx(fontSize)}px` }
            : { maxHeight: sideSlot ? "100%" : undefined }),
        }}
        aria-label="图例"
      >
        {visibleItems.map((item) => (
          <li key={item.name} className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5">
            <span
              className="inline-flex shrink-0 items-center justify-center"
              style={legendMarkerStyle(icon, item.color, iconSize)}
              aria-hidden
            />
            <span
              className="max-w-[7rem] truncate leading-tight"
              title={item.name}
              style={{ color: textColor ?? "var(--dashboard-text-muted,#667085)" }}
            >
              {item.name}
            </span>
          </li>
        ))}
      </ul>
      {horizontal && pageCount > 1 ? (
        <div className="pointer-events-auto flex items-center justify-center gap-1 px-1.5 pb-1 text-[10px] text-gray-500 dark:text-gray-400">
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-white/10"
            disabled={safePage <= 0}
            aria-label="上一页图例"
            onClick={() => onPageChange(Math.max(0, safePage - 1))}
          >
            <ChevronLeft className="size-3" aria-hidden />
          </button>
          <span className="tabular-nums">
            {safePage + 1}/{pageCount}
          </span>
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-white/10"
            disabled={safePage >= pageCount - 1}
            aria-label="下一页图例"
            onClick={() => onPageChange(Math.min(pageCount - 1, safePage + 1))}
          >
            <ChevronRight className="size-3" aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}

type EmbeddedChartLegendShellProps = {
  position: NonNullable<ChartLegendStyle["position"]>;
  fontSize?: number;
  orient?: NonNullable<ChartLegendStyle["orient"]>;
  hAlign?: ChartLegendHAlign;
  vAlign?: ChartLegendVAlign;
  icon?: ChartLegendIconShape;
  iconSize?: number;
  textColor?: string;
  items: ChartLegendItem[];
  children: ReactNode;
};

/** 看板内嵌：图例贴在组件外框 pixel-shape-inner（含标题区），flex 分区不叠在图表上 */
export function EmbeddedChartLegendShell({
  position,
  fontSize,
  orient,
  hAlign = "center",
  vAlign = "bottom",
  icon,
  iconSize,
  textColor,
  items,
  children,
}: EmbeddedChartLegendShellProps) {
  const [page, setPage] = useState(0);
  const itemsKey = useMemo(() => items.map((item) => item.name).join("\0"), [items]);

  useEffect(() => {
    setPage(0);
  }, [itemsKey, position, orient]);

  const sideSlot = position === "left" || position === "right";
  const stackSlot = position === "top" || position === "bottom";

  const legend = (
    <EmbeddedChartLegend
      items={items}
      fontSize={fontSize}
      position={position}
      orient={orient}
      hAlign={hAlign}
      vAlign={vAlign}
      icon={icon}
      iconSize={iconSize}
      textColor={textColor}
      page={page}
      onPageChange={setPage}
    />
  );

  const legendSlot = sideSlot ? (
    <div
      className={cn(
        "z-0 flex h-full min-h-0 shrink-0 flex-col overflow-hidden",
        legendSideAlignClass(vAlign),
      )}
      style={{ maxWidth: EMBEDDED_SIDE_LEGEND_MAX_WIDTH }}
      data-legend-slot="side"
    >
      {legend}
    </div>
  ) : (
    <div className="z-0 shrink-0">{legend}</div>
  );

  const chartArea = (
    <div className="relative z-[1] min-h-0 min-w-0 flex-1 basis-0 overflow-hidden pb-0.5">
      {children}
    </div>
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 overflow-hidden",
        stackSlot ? "flex-col" : "flex-row",
      )}
      data-legend-position={position}
    >
      {position === "top" || position === "left" ? legendSlot : null}
      {chartArea}
      {position === "bottom" || position === "right" ? legendSlot : null}
    </div>
  );
}

export {
  readChartLegendIcon,
  readChartLegendIconSize,
  readChartLegendOrient,
  readChartLegendHAlign,
  readChartLegendVAlign,
  resolveEmbeddedLegendOrient,
};
