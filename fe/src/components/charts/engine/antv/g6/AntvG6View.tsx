import { memo, useEffect, useMemo, useRef } from "react";
import { Graph } from "@antv/g6";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildAntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import { cn } from "@/lib/utils";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";

function AntvG6ViewInner({
  viewModel,
  fill = false,
  height = 180,
  width,
  ariaLabel,
  onInteraction,
  onJumpClick,
}: ChartEngineViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<Graph | null>(null);

  const plan = useMemo(() => buildAntvRenderPlan(viewModel), [viewModel]);

  useEffect(() => {
    if (!containerRef.current || plan.kind !== "g6") return;
    graphRef.current?.destroy();
    const graph = new Graph({
      container: containerRef.current,
      width: width ?? (containerRef.current.clientWidth || 400),
      height: fill ? containerRef.current.clientHeight || height : height,
      data: {
        nodes: (plan.options.nodes as Array<{ id: string; data?: { label?: string } }>) ?? [],
        edges: (plan.options.edges as Array<{ source: string; target: string }>) ?? [],
      },
      layout: plan.options.layout as { type: string },
      behaviors: ["drag-canvas", "zoom-canvas", "drag-element"],
    });
    graph.on("node:click", (evt) => {
      if (onJumpClick) {
        onJumpClick();
        return;
      }
      const id = (evt as { target?: { id?: string } }).target?.id;
      if (id && onInteraction) onInteraction({ kind: "drill", value: id, label: id });
    });
    graph.render();
    graphRef.current = graph;
    return () => {
      graph.destroy();
      graphRef.current = null;
    };
  }, [plan, fill, height, width, onInteraction, onJumpClick]);

  useEmbeddedChartLiveResize(fill, containerRef, () => {
    if (!containerRef.current || !graphRef.current) return;
    graphRef.current.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
    );
  });

  return (
    <div
      ref={containerRef}
      className={cn("w-full", fill ? "absolute inset-0 min-h-0" : "min-h-[180px]")}
      aria-label={ariaLabel}
      data-testid="antv-g6-chart"
      style={fill ? undefined : { height, width: width ?? "100%" }}
    />
  );
}

export const AntvG6View = memo(AntvG6ViewInner);
