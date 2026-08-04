import { useEffect, useRef } from "react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { ChartDrillProvider } from "@/components/charts/ChartDrillContext";
import { WidgetChartLegendShell } from "@/components/charts/WidgetChartLegendShell";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import { FilterWidget } from "@/components/dashboard/FilterWidget";
import { TextWidget } from "@/components/dashboard/TextWidget";
import { MediaWidget } from "@/components/dashboard/MediaWidget";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import { WidgetShellLegendProvider } from "@/components/dashboard/pixelCanvas/widgetShellLegendContext";
import { VizComponentChartPreviewShell } from "@/components/dashboard/viz-components/VizComponentChartPreviewShell";
import type { Geo3dRenderTier } from "@/components/charts/engine/three/geo3dRuntime";
import { useElementSize } from "@/hooks/useElementSize";
import { useInViewport } from "@/hooks/useInViewport";
import { useAdminHeavyRenderSuspended } from "@/hooks/useAdminHeavyRenderSuspended";
import { isGeoMapChartType, type ChartViewConfig } from "@/lib/chartViewConfig";
import { cn } from "@/lib/utils";

type VizComponentLivePreviewProps = {
  widget: LayoutWidget;
  className?: string;
  /** 列表卡片等场景：进视口后再挂载图表 */
  lazy?: boolean;
  geo3dRenderTier?: Geo3dRenderTier;
  /** 列表卡片缩略图：隐藏组件内标题栏 */
  compact?: boolean;
  /** 地图下钻栈持久化（编辑页同步 manualDrillStack） */
  onChartConfigChange?: (cfg: ChartViewConfig) => void;
};

export function VizComponentLivePreview({
  widget,
  className,
  lazy = false,
  geo3dRenderTier,
  compact = false,
  onChartConfigChange,
}: VizComponentLivePreviewProps) {
  const navSuspended = useAdminHeavyRenderSuspended();
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: viewRef, inView } = useInViewport<HTMLDivElement>({
    enabled: lazy,
    rootMargin: "80px",
  });
  const { width, height } = useElementSize(containerRef);
  const active = !navSuspended && (!lazy || inView);

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
  const chartConfig = widget.type === "chart" ? widget.chartConfig : undefined;
  const drillEnabled = Boolean(chartConfig && isGeoMapChartType(chartConfig.chartType));

  return (
    <div
      ref={setContainerRef}
      className={cn("relative h-full min-h-0 w-full", className)}
      data-testid="viz-component-live-preview"
      data-live={active ? "true" : "false"}
    >
      {widget.type === "chart" && widget.chartConfig ? (
        <VizComponentChartPreviewShell
          widget={widget as LayoutWidget & { chartConfig: NonNullable<typeof widget.chartConfig> }}
          compact={compact}
        >
          <WidgetShellLegendProvider>
            <WidgetChartLegendShell>
              <ChartDrillProvider>
                <ChartRenderer
                  embedded
                  config={widget.chartConfig}
                  title={widget.title}
                  widgetId={widget.id}
                  drillEnabled={drillEnabled}
                  queryEnabled={active}
                  renderEnabled={active}
                  dashboardEditMode
                  pixelSize={{ width: chartWidth, height: chartHeight }}
                  geo3dRenderTier={geo3dRenderTier}
                  onChartConfigChange={onChartConfigChange}
                />
              </ChartDrillProvider>
            </WidgetChartLegendShell>
          </WidgetShellLegendProvider>
        </VizComponentChartPreviewShell>
      ) : null}
      {widget.type === "filter" && widget.filterConfig ? (
        <FilterWidget
          widget={widget as LayoutWidget & { filterConfig: NonNullable<typeof widget.filterConfig> }}
          mode="view"
          shell={compact ? "shape" : "grid"}
          value={widget.filterConfig.defaultValue ?? ""}
          onValueChange={() => undefined}
        />
      ) : null}
      {widget.type === "text" && widget.textConfig ? (
        <TextWidget
          widget={widget as LayoutWidget & { textConfig: NonNullable<typeof widget.textConfig> }}
          mode="view"
          shell={compact ? "shape" : "grid"}
        />
      ) : null}
      {widget.type === "media" && widget.mediaConfig ? (
        <MediaWidget
          widget={widget as LayoutWidget & { mediaConfig: NonNullable<typeof widget.mediaConfig> }}
          mode="view"
          shell={compact ? "shape" : "grid"}
        />
      ) : null}
    </div>
  );
}
