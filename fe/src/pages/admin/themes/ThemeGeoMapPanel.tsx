import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { buildGeoMapEchartsOption } from "@/lib/geoMapChart";
import { getEchartsTheme } from "@/lib/echarts-theme";

type ThemeGeoMapPanelProps = {
  columns: string[];
  rows: unknown[][];
  ariaLabel?: string;
  onProvinceClick?: (provinceName: string) => void;
};

function resolveFieldIndex(columns: string[], candidates: string[], fallback: number): number {
  for (const name of candidates) {
    const idx = columns.indexOf(name);
    if (idx >= 0) return idx;
  }
  return fallback;
}

export function ThemeGeoMapPanel({
  columns,
  rows,
  ariaLabel = "GIS 分布地图",
  onProvinceClick,
}: ThemeGeoMapPanelProps) {
  const option = useMemo(() => {
    const regionIdx = resolveFieldIndex(columns, ["region", "province", "name"], 0);
    const metricIdx = resolveFieldIndex(columns, ["cnt", "value", "count"], 1);
    const regionField = columns[regionIdx] ?? columns[0] ?? "region";
    const metricField = columns[metricIdx] ?? columns[1] ?? columns[0] ?? "value";
    return buildGeoMapEchartsOption({
      rows,
      columns,
      regionField,
      metricField,
      geo: { roam: false, visualMap: true, showRegionLabel: false },
    });
  }, [columns, rows]);

  return (
    <div className="min-h-[280px] w-full" aria-label={ariaLabel}>
      <ReactECharts
        option={option}
        theme={getEchartsTheme("light")}
        style={{ height: 280, width: "100%" }}
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
