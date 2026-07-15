import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts/core";
import regionsGeo from "@/assets/geo/regions-simplified.json";
import { getEchartsTheme } from "@/lib/echarts-theme";

type ThemeGeoMapPanelProps = {
  columns: string[];
  rows: unknown[][];
  ariaLabel?: string;
  onProvinceClick?: (provinceName: string) => void;
};

function colIndex(columns: string[], field: string): number {
  return columns.indexOf(field);
}

export function ThemeGeoMapPanel({
  columns,
  rows,
  ariaLabel = "GIS 分布地图",
  onProvinceClick,
}: ThemeGeoMapPanelProps) {
  const option = useMemo(() => {
    const regionIdx = colIndex(columns, "region") >= 0 ? colIndex(columns, "region") : 0;
    const metricIdx =
      colIndex(columns, "cnt") >= 0
        ? colIndex(columns, "cnt")
        : colIndex(columns, "value") >= 0
          ? colIndex(columns, "value")
          : 1;
    echarts.registerMap("vs-regions", regionsGeo as never);
    const data = rows.map((r) => ({
      name: String(r[regionIdx] ?? ""),
      value: Number(r[metricIdx] ?? 0),
    }));
    return {
      tooltip: { trigger: "item" },
      series: [{ type: "map", map: "vs-regions", roam: false, data }],
    };
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
