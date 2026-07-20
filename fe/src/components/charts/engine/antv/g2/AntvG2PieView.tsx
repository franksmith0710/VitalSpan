import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Chart } from "@antv/g2";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import { encodePieRows } from "@/components/charts/engine/antv/spec/encodePie";
import { buildG2PieRenderConfig } from "@/components/charts/engine/antv/g2/buildG2PieOptions";
import { cn } from "@/lib/utils";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import {
  ADVANCED_CHART_ROW_CAP,
  capRows,
} from "@/components/charts/engine/buildDatasetEncoding";

function extractPieDrillValue(datum: Record<string, unknown>): string {
  const candidates = [datum.type, datum.name, datum.category];
  for (const c of candidates) {
    if (c != null && String(c) !== "") return String(c);
  }
  return "";
}

function AntvG2PieViewInner(props: ChartEngineViewProps) {
  const {
    viewModel,
    style,
    fill = false,
    height = 180,
    width,
    ariaLabel,
    onInteraction,
    onJumpClick,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const spec = useMemo(() => chartViewModelToRenderSpec(viewModel), [viewModel]);
  const rows = viewModel.dataset.rows;
  const columns = viewModel.dataset.columns;
  const { rows: capped, truncated } = useMemo(
    () => capRows(rows, ADVANCED_CHART_ROW_CAP),
    [rows],
  );

  const pieRows = useMemo(
    () => encodePieRows(spec, capped, columns),
    [spec, capped, columns],
  );

  const config = useMemo(
    () => buildG2PieRenderConfig(viewModel.chartType, pieRows, style),
    [viewModel.chartType, pieRows, style],
  );

  const configKey = useMemo(() => JSON.stringify(config), [config]);

  const handleElementClick = useCallback(
    (datum: Record<string, unknown>) => {
      if (onJumpClick) {
        onJumpClick();
        return;
      }
      if (!onInteraction) return;
      const value = extractPieDrillValue(datum);
      if (!value) return;
      onInteraction({ kind: "drill", value, label: value });
    },
    [onJumpClick, onInteraction],
  );

  useEffect(() => {
    if (!containerRef.current || pieRows.length === 0) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    chartRef.current?.destroy();

    const chart = new Chart({
      container: containerRef.current,
      autoFit: true,
      padding: "auto",
      supportCSSTransform: true,
    } as ConstructorParameters<typeof Chart>[0]);

    const mark = chart.interval().data(config.data);
    mark
      .coordinate({
        type: "theta",
        innerRadius: config.innerRadius,
        outerRadius: config.outerRadius,
      })
      .transform({ type: "stackY" })
      .encode("y", "value")
      .encode("color", "type")
      .scale("color", {
        domain: config.data.map((row) => row.type),
        range: config.data.map((row) => row.segmentColor),
      })
      .style("stroke", "#fff")
      .style("lineWidth", 1)
      .interaction("elementHoverScale", {
        scale: config.hoverScale,
        shadow: true,
        shadowBlur: 10,
        delay: 60,
      });

    if (config.isRose) {
      mark.scale("y", { type: "sqrt" });
    }

    if (config.showTooltip) {
      mark.tooltip({ title: "type", items: [{ field: "value" }] });
    } else {
      chart.interaction("tooltip", false);
    }

    if (config.showLegend) {
      mark.legend("color", {
        position: config.legendPosition,
        itemLabelFill: style.scheme === "dark" ? "rgba(255,255,255,0.85)" : "#344054",
      });
    } else {
      mark.legend(false);
    }

    if (config.showLabel) {
      mark.label({
        text: "type",
        position: "outside",
        style: { fill: config.labelFill, fontSize: config.labelFontSize },
      });
    } else {
      mark.label(false);
    }

    if (onInteraction || onJumpClick) {
      chart.on("element:click", (ev: { data?: { data?: Record<string, unknown> } }) => {
        const datum = ev.data?.data;
        if (datum) handleElementClick(datum);
      });
    }

    chart.render();
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, [configKey, pieRows.length, handleElementClick, onInteraction, onJumpClick, style.scheme]);

  useEmbeddedChartLiveResize(fill && pieRows.length > 0, containerRef, () =>
    chartRef.current?.render(),
  );

  if (pieRows.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-theme-sm text-gray-400 dark:text-gray-500",
          fill ? "absolute inset-0" : "min-h-[180px]",
        )}
        role="status"
        aria-label="暂无数据"
      >
        暂无数据
      </div>
    );
  }

  return (
    <div
      className={cn("w-full", fill ? "absolute inset-0 flex min-h-0 flex-col" : "min-h-[120px]")}
      aria-label={ariaLabel}
    >
      {truncated && !fill ? (
        <p role="status" className="mb-2 shrink-0 text-theme-sm text-warning-600 dark:text-warning-400">
          数据量较大，已采样显示前 {ADVANCED_CHART_ROW_CAP} 条
        </p>
      ) : null}
      <div
        ref={containerRef}
        className={cn(fill ? "min-h-0 flex-1" : "w-full")}
        data-testid="antv-g2-pie-chart"
        style={fill ? undefined : { height, width: width ?? "100%" }}
      />
    </div>
  );
}

export const AntvG2PieView = memo(AntvG2PieViewInner);
