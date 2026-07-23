import * as d3 from "d3";
import {
  dimOpacity,
  subscribeSeriesFocus,
  type getSeriesInteractionState,
} from "@/components/charts/engine/d3/core/interactionBus";

/** 将 plot 内带 data-series-key 的元素接到图例 dim/toggle */
export function wirePlotSeriesLegendDimming(
  plot: d3.Selection<SVGGElement, unknown, null, undefined>,
): () => void {
  return subscribeSeriesFocus((focused, hidden) => {
    const dimmed = focused != null || hidden.size > 0;
    plot.selectAll<SVGElement, unknown>("[data-series-key]").each(function () {
      const el = d3.select(this);
      const key = el.attr("data-series-key");
      const visible = !hidden.has(key);
      const active = focused === key || focused == null;
      const opacity = visible ? dimOpacity(active, dimmed) : 0;
      el.attr("opacity", opacity).attr("display", visible ? null : "none");
    });
  });
}

export function resolveSeriesOpacity(
  seriesKey: string,
  state: ReturnType<typeof getSeriesInteractionState>,
  base = 0.92,
): number {
  const { focused, hidden } = state;
  if (hidden.has(seriesKey)) return 0;
  const dimmed = focused != null || hidden.size > 0;
  const active = focused === seriesKey || focused == null;
  return dimOpacity(active, dimmed, base);
}
