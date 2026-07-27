import { useRef, useState } from "react";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { FilterWidget } from "@/components/dashboard/FilterWidget";
import { TextWidget } from "@/components/dashboard/TextWidget";
import { MediaWidget } from "@/components/dashboard/MediaWidget";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import { useElementSize } from "@/hooks/useElementSize";
import { cn } from "@/lib/utils";

type VizComponentLivePreviewProps = {
  widget: LayoutWidget;
  className?: string;
};

export function VizComponentLivePreview({ widget, className }: VizComponentLivePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(containerRef);
  const [filterValue, setFilterValue] = useState(
    widget.type === "filter" ? widget.filterConfig?.defaultValue ?? "" : "",
  );

  const chartWidth = Math.max(width, 320);
  const chartHeight = Math.max(height, 280);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full min-h-0 w-full", className)}
      data-testid="viz-component-live-preview"
    >
      {widget.type === "chart" && widget.chartConfig ? (
        <ChartRenderer
          embedded
          config={widget.chartConfig}
          title=""
          widgetId={widget.id}
          queryEnabled
          renderEnabled
          dashboardEditMode
          pixelSize={{ width: chartWidth, height: chartHeight }}
        />
      ) : null}
      {widget.type === "filter" && widget.filterConfig ? (
        <div className="flex h-full items-start justify-center p-4">
          <div className="w-full max-w-md">
            <FilterWidget
              widget={
                widget as LayoutWidget & { filterConfig: NonNullable<typeof widget.filterConfig> }
              }
              mode="view"
              value={filterValue}
              onValueChange={(_, value) => setFilterValue(value)}
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
