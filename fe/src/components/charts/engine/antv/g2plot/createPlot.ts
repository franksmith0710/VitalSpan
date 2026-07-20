import type { Plot } from "@antv/g2plot";
import { withCanvasCssTransformSupport } from "@/components/charts/engine/cssTransformSupport";
import {
  Bar,
  BidirectionalBar,
  CirclePacking,
  Column,
  DualAxes,
  Funnel,
  Gauge,
  Heatmap,
  Line,
  Liquid,
  Pie,
  Radar,
  Sankey,
  Scatter,
  Treemap,
  Waterfall,
  WordCloud,
} from "@antv/g2plot";

type PlotCtor = new (container: HTMLElement, options: Record<string, unknown>) => Plot<Record<string, unknown>>;

const PLOT_MAP: Record<string, PlotCtor> = {
  Line: Line as unknown as PlotCtor,
  Column: Column as unknown as PlotCtor,
  Bar: Bar as unknown as PlotCtor,
  Pie: Pie as unknown as PlotCtor,
  Gauge: Gauge as unknown as PlotCtor,
  Scatter: Scatter as unknown as PlotCtor,
  DualAxes: DualAxes as unknown as PlotCtor,
  Funnel: Funnel as unknown as PlotCtor,
  Sankey: Sankey as unknown as PlotCtor,
  Heatmap: Heatmap as unknown as PlotCtor,
  WordCloud: WordCloud as unknown as PlotCtor,
  BidirectionalBar: BidirectionalBar as unknown as PlotCtor,
  Waterfall: Waterfall as unknown as PlotCtor,
  Liquid: Liquid as unknown as PlotCtor,
  Radar: Radar as unknown as PlotCtor,
  Treemap: Treemap as unknown as PlotCtor,
  CirclePacking: CirclePacking as unknown as PlotCtor,
};

export function createG2Plot(
  plotType: string,
  container: HTMLElement,
  options: Record<string, unknown>,
): Plot<Record<string, unknown>> | null {
  const Ctor = PLOT_MAP[plotType];
  if (!Ctor) return null;
  return new Ctor(container, withCanvasCssTransformSupport(options));
}

export function supportedG2PlotTypes(): string[] {
  return Object.keys(PLOT_MAP);
}
