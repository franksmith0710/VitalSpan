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

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]",
        className,
      )}
      data-testid="viz-component-live-preview"
    >
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {widget.type === "chart" && widget.chartConfig ? (
          <ChartRenderer
            embedded
            config={widget.chartConfig}
            title={widget.title}
            widgetId={widget.id}
            queryEnabled
            renderEnabled
            dashboardEditMode
            pixelSize={{
              width: Math.max(width - 32, 320),
              height: Math.max(height - 32, 240),
            }}
          />
        ) : null}
        {widget.type === "filter" && widget.filterConfig ? (
          <div className="mx-auto w-full max-w-md pt-8">
            <FilterWidget
              widget={widget as LayoutWidget & { filterConfig: NonNullable<typeof widget.filterConfig> }}
              mode="view"
              value={filterValue}
              onValueChange={(_, value) => setFilterValue(value)}
            />
          </div>
        ) : null}
        {widget.type === "text" && widget.textConfig ? (
          <TextWidget
            widget={widget as LayoutWidget & { textConfig: NonNullable<typeof widget.textConfig> }}
            mode="view"
          />
        ) : null}
        {widget.type === "media" && widget.mediaConfig ? (
          <MediaWidget
            widget={widget as LayoutWidget & { mediaConfig: NonNullable<typeof widget.mediaConfig> }}
            mode="view"
          />
        ) : null}
      </div>
    </div>
  );
}
