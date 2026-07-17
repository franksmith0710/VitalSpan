import type { Linkage } from "@/components/dashboard/dashboardFilterUtils";
import { DashboardLayoutPreview } from "@/components/dashboard/DashboardLayoutPreview";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { CanvasScaleViewport } from "./CanvasScaleViewport";
import type { PresentationMode } from "./presentationScale";

export type DataScreenPresenterProps = {
  layout: DashboardLayout;
  presentationMode?: PresentationMode;
  linkage?: Linkage | null;
  filterValues?: Record<string, string>;
  onFilterValueChange?: (filterId: string, value: string) => void;
  globalChartRefreshKey?: number;
  className?: string;
};

export function DataScreenPresenter({
  layout,
  presentationMode = "fit",
  linkage = null,
  filterValues = {},
  onFilterValueChange,
  globalChartRefreshKey = 0,
  className,
}: DataScreenPresenterProps) {
  if (layout.version !== 2) {
    return (
      <DashboardLayoutPreview
        layout={layout}
        linkage={linkage}
        filterValues={filterValues}
        onFilterValueChange={onFilterValueChange}
        className={className}
      />
    );
  }

  const { width, height } = layout.canvas;

  return (
    <CanvasScaleViewport
      canvasWidth={width}
      canvasHeight={height}
      mode={presentationMode}
      className={className}
    >
      <div className="h-full w-full" style={{ width, height }}>
        <DashboardLayoutPreview
          layout={layout}
          linkage={linkage}
          filterValues={filterValues}
          onFilterValueChange={onFilterValueChange}
          fixedDesignViewport
          globalChartRefreshKey={globalChartRefreshKey}
          className="h-full w-full"
        />
      </div>
    </CanvasScaleViewport>
  );
}
