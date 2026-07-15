import { useMemo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type EChartsReact from "echarts-for-react";
import {
  buildGeoMapPlaceholderEchartsOption,
  DEFAULT_GEO_MAP_PLACEHOLDER_HINT,
} from "@/lib/geoMapChart";
import { dwHint } from "@/components/dashboard/dashboardWidgetTypography";
import { getEchartsTheme } from "@/lib/echarts-theme";
import { cn } from "@/lib/utils";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";

type Props = {
  hint?: string;
  isDark?: boolean;
  fill?: boolean;
  height?: number;
  className?: string;
  "data-testid"?: string;
};

/** 未配置 / 无数据时的中国地图轮廓占位（对标 DataEase 图案地图） */
export function GeoMapPlaceholderChart({
  hint = DEFAULT_GEO_MAP_PLACEHOLDER_HINT,
  isDark = false,
  fill = true,
  height = 180,
  className,
  "data-testid": testId = "geo-map-placeholder",
}: Props) {
  const chartRef = useRef<EChartsReact | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scheme = isDark ? "dark" : "light";
  const option = useMemo(
    () => buildGeoMapPlaceholderEchartsOption({ isDark }),
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
