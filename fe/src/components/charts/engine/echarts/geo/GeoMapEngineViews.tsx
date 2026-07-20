import { useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type EChartsReact from "echarts-for-react";
import { echartsGeoEngine } from "@/components/charts/engine/geoEnginePort";
import { VIZ_WHEEL_ZOOM_SURFACE_ATTR } from "@/components/dashboard/pixelCanvas/pixelCanvasWheelScroll";
import { getEchartsTheme } from "@/components/charts/engine/echarts/theme";
import { cn } from "@/lib/utils";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";

type GeoMapPlaceholderViewProps = {
  hint?: string;
  isDark?: boolean;
  fill?: boolean;
  height?: number;
  className?: string;
  "data-testid"?: string;
};

export function GeoMapPlaceholderView({
  hint,
  isDark = false,
  fill = true,
  height = 180,
  className,
  "data-testid": testId = "geo-map-placeholder",
}: GeoMapPlaceholderViewProps) {
  const chartRef = useRef<EChartsReact | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scheme = isDark ? "dark" : "light";
  const option = useMemo(
    () =>
      echartsGeoEngine.buildMapPlaceholder({
        isDark,
        roam: echartsGeoEngine.resolveEmbeddedRoam(true),
      }),
    [isDark],
  );
  const theme = useMemo(() => getEchartsTheme(scheme), [scheme]);

  useEmbeddedChartLiveResize(fill, containerRef, () => {
    chartRef.current?.getEchartsInstance()?.resize();
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full",
        fill ? "h-full min-h-0" : "min-h-[120px]",
        className,
      )}
      data-testid={testId}
      aria-label="中国地图占位"
      {...{ [VIZ_WHEEL_ZOOM_SURFACE_ATTR]: "true" }}
    >
      <ReactECharts
        key={scheme}
        ref={chartRef}
        option={option}
        theme={theme}
        style={
          fill
            ? { height: "100%", width: "100%", minHeight: 0 }
            : { height, width: "100%" }
        }
        opts={{ renderer: "canvas" }}
        notMerge
        lazyUpdate
        autoResize={fill}
      />
      {hint ? (
        <p
          className={cn("dw-hint pointer-events-none absolute inset-x-0 bottom-[10%] text-center")}
          role="status"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type ThemeGeoMapPreviewProps = {
  option: Record<string, unknown>;
  ariaLabel?: string;
  height?: number;
  onProvinceClick?: (provinceName: string) => void;
};

export function ThemeGeoMapPreview({
  option,
  ariaLabel = "GIS 分布地图",
  height = 280,
  onProvinceClick,
}: ThemeGeoMapPreviewProps) {
  return (
    <div className="min-h-[280px] w-full" aria-label={ariaLabel}>
      <ReactECharts
        option={option}
        theme={getEchartsTheme("light")}
        style={{ height, width: "100%" }}
        opts={{ renderer: "canvas" }}
        data-testid="theme-geo-map"
        onEvents={{
          click: (params: { name?: string }) => {
            if (params.name) onProvinceClick?.(params.name);
          },
        }}
      />
    </div>
  );
}
