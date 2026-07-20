import { useCallback, useEffect, useRef } from "react";
import type { Plot } from "@antv/g2plot";
import { createG2Plot } from "@/components/charts/engine/antv/g2plot/createPlot";
import {
  embeddedSizeChanged,
  readEmbeddedContainerSize,
} from "@/components/charts/engine/embeddedContainerSize";
import { useChartVisualScale } from "@/hooks/useChartVisualScale";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";

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
  layoutFootprint?: { width: number; height: number },
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<Plot<Record<string, unknown>> | null>(null);
  const plotTypeRef = useRef(plotType);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const visualScale = useChartVisualScale();
  const isShapePlaying = usePixelShapePlayer();
  const isShapePlayingRef = useRef(isShapePlaying);
  isShapePlayingRef.current = isShapePlaying;
  const lastSizeRef = useRef({ width: 0, height: 0 });

  const applyContainerSize = useCallback((force = false) => {
    if (!force && isShapePlayingRef.current) return;
    const next = readEmbeddedContainerSize(containerRef.current);
    if (!next || !plotRef.current) return;
    if (!embeddedSizeChanged(next, lastSizeRef.current)) return;
    lastSizeRef.current = next;
    plotRef.current.changeSize(next.width, next.height);
  }, []);

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
      applyContainerSize();
      return;
    }

    if (isShapePlayingRef.current) return;

    plotRef.current.update(options);
    bindElementClick(plotRef.current, handlersRef.current);
    applyContainerSize();
  }, [plotType, options, enabled, applyContainerSize]);

  useEffect(() => {
    if (!enabled || !plotRef.current || isShapePlaying) return;
    applyContainerSize();
  }, [visualScale, enabled, isShapePlaying, applyContainerSize]);

  useEffect(() => {
    if (!enabled || !layoutFootprint || isShapePlaying) return;
    applyContainerSize();
  }, [enabled, isShapePlaying, layoutFootprint?.width, layoutFootprint?.height, applyContainerSize]);

  const resize = useCallback(() => {
    applyContainerSize(true);
  }, [applyContainerSize]);

  return { containerRef, plotRef, resize };
}
