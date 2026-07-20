import { useCallback, useEffect, useRef } from "react";
import type { Plot } from "@antv/g2plot";
import { createG2Plot } from "@/components/charts/engine/antv/g2plot/createPlot";
import { useChartVisualScale } from "@/hooks/useChartVisualScale";

export type G2PlotInteractionHandlers = {
  onElementClick?: (datum: Record<string, unknown>) => void;
};

function bindElementClick(
  plot: Plot<Record<string, unknown>>,
  handlers?: G2PlotInteractionHandlers,
) {
  plot.off("element:click");
  if (!handlers?.onElementClick) return;
  plot.on("element:click", (evt: { data?: { data?: Record<string, unknown> } }) => {
    const datum = evt.data?.data;
    if (datum) handlers.onElementClick?.(datum);
  });
}

export function useG2Plot(
  plotType: string | undefined,
  options: Record<string, unknown> | undefined,
  enabled = true,
  handlers?: G2PlotInteractionHandlers,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<Plot<Record<string, unknown>> | null>(null);
  const plotTypeRef = useRef(plotType);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const visualScale = useChartVisualScale();
  const lastSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !containerRef.current || !plotType || !options) {
      plotRef.current?.destroy();
      plotRef.current = null;
      return;
    }

    const typeChanged = plotTypeRef.current !== plotType;
    plotTypeRef.current = plotType;

    if (!plotRef.current || typeChanged) {
      plotRef.current?.destroy();
      const plot = createG2Plot(plotType, containerRef.current, options);
      if (!plot) {
        plotRef.current = null;
        return;
      }
      plotRef.current = plot;
      bindElementClick(plot, handlersRef.current);
      lastSizeRef.current = { width: 0, height: 0 };
      plot.render();
      return;
    }

    plotRef.current.update(options);
    bindElementClick(plotRef.current, handlersRef.current);
  }, [plotType, options, enabled]);

  useEffect(() => {
    if (!enabled || !plotRef.current) return;
    const el = containerRef.current;
    if (el) {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (
        width === lastSizeRef.current.width &&
        height === lastSizeRef.current.height
      ) {
        return;
      }
      lastSizeRef.current = { width, height };
      plotRef.current.changeSize(width, height);
    }
  }, [visualScale, enabled]);

  const resize = useCallback(() => {
    const el = containerRef.current;
    if (!el || !plotRef.current) return;
    const width = el.clientWidth;
    const height = el.clientHeight;
    if (
      width === lastSizeRef.current.width &&
      height === lastSizeRef.current.height
    ) {
      return;
    }
    lastSizeRef.current = { width, height };
    plotRef.current.changeSize(width, height);
  }, []);

  return { containerRef, plotRef, resize };
}
