import { useEffect, useRef } from "react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { FilterWidget } from "@/components/dashboard/FilterWidget";
import { TextWidget } from "@/components/dashboard/TextWidget";
import { MediaWidget } from "@/components/dashboard/MediaWidget";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import type { Geo3dRenderTier } from "@/components/charts/engine/three/geo3dRuntime";
import { useElementSize } from "@/hooks/useElementSize";
import { useInViewport } from "@/hooks/useInViewport";
import { cn } from "@/lib/utils";

type VizComponentLivePreviewProps = {
  widget: LayoutWidget;
  className?: string;
  /** 列表卡片等场景：进视口后再挂载图表 */
  lazy?: boolean;
  geo3dRenderTier?: Geo3dRenderTier;
};

export function VizComponentLivePreview({
  widget,
  className,
  lazy = false,
  geo3dRenderTier,
}: VizComponentLivePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: viewRef, inView } = useInViewport<HTMLDivElement>({
    enabled: lazy,
    rootMargin: "160px",
  });
  const { width, height } = useElementSize(containerRef);
  const active = !lazy || inView;

  const setContainerRef = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    viewRef(node);
  };

  useEffect(() => {
    if (!active) return undefined;
    setChartAnimationSuppressed(true);
    return () => setChartAnimationSuppressed(false);
  }, [active]);

  const chartWidth = Math.max(width, 120);
  const chartHeight = Math.max(height, 96);

  return (
    <div
      ref={setContainerRef}
      className={cn("relative h-full min-h-0 w-full", className)}
      data-testid="viz-component-live-preview"
      data-live={active ? "true" : "false"}
    >
      {widget.type === "chart" && widget.chartConfig ? (
        <ChartRenderer
          embedded
          config={widget.chartConfig}
          title=""
          widgetId={widget.id}
          queryEnabled={active}
          renderEnabled={active}
          dashboardEditMode
          pixelSize={{ width: chartWidth, height: chartHeight }}
          geo3dRenderTier={geo3dRenderTier}
        />
      ) : null}
      {widget.type === "filter" && widget.filterConfig ? (
        <div className="flex h-full items-start justify-center p-3">
          <div className="w-full max-w-md">
            <FilterWidget
              widget={
                widget as LayoutWidget & { filterConfig: NonNullable<typeof widget.filterConfig> }
              }
              mode="view"
              value={widget.filterConfig.defaultValue ?? ""}
              onValueChange={() => undefined}
            />
          </div>
        </div>
      ) : null}
      {widget.type === "text" && widget.textConfig ? (
        <div className="h-full overflow-auto p-3">
          <TextWidget
            widget={widget as LayoutWidget & { textConfig: NonNullable<typeof widget.textConfig> }}
            mode="view"
          />
        </div>
      ) : null}
      {widget.type === "media" && widget.mediaConfig ? (
        <div className="flex h-full items-center justify-center p-3">
          <MediaWidget
            widget={widget as LayoutWidget & { mediaConfig: NonNullable<typeof widget.mediaConfig> }}
            mode="view"
          />
        </div>
      ) : null}
    </div>
  );
}
