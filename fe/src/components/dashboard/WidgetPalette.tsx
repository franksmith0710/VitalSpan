import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ChartType } from "@/lib/chartViewConfig";
import { fetchChartTypeCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";

const BASIC_TYPES = new Set(["table", "line", "bar"]);
const EXTENDED_FALLBACK: Array<{ type: ChartType; label: string }> = [
  { type: "map", label: "地图" },
  { type: "heatmap", label: "热力图" },
  { type: "kpi", label: "KPI 指标" },
  { type: "timeline", label: "时间轴" },
];

type WidgetPaletteProps = {
  onInsert: (type: ChartType) => void;
};

function groupCatalog(items: ChartTypeCatalogItem[]) {
  const basic: ChartTypeCatalogItem[] = [];
  const extended: ChartTypeCatalogItem[] = [];
  for (const item of items) {
    if (BASIC_TYPES.has(item.type)) basic.push(item);
    else if (["map", "heatmap", "kpi", "timeline"].includes(item.type)) extended.push(item);
  }
  return { basic, extended };
}

export function WidgetPalette({ onInsert }: WidgetPaletteProps) {
  const [catalog, setCatalog] = useState<ChartTypeCatalogItem[] | null>(null);

  useEffect(() => {
    void fetchChartTypeCatalog()
      .then((items) => setCatalog(Array.isArray(items) ? items : null))
      .catch(() => setCatalog(null));
  }, []);

  const { basic, extended } = useMemo(() => {
    if (!catalog || !Array.isArray(catalog)) {
      return {
        basic: [
          { type: "table", displayName: "表格" },
          { type: "line", displayName: "折线图" },
          { type: "bar", displayName: "柱状图" },
        ] as ChartTypeCatalogItem[],
        extended: EXTENDED_FALLBACK.map((x) => ({
          type: x.type,
          displayName: x.label,
          category: "extended",
          renderer: "echarts",
          styleVariants: ["default"],
          fieldRule: {},
        })),
      };
    }
    return groupCatalog(catalog);
  }, [catalog]);

  const renderGroup = (title: string, items: ChartTypeCatalogItem[]) => (
    <div className="space-y-2">
      <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {items.map((item) => (
        <Button
          key={item.type}
          type="button"
          variant="outline"
          className="w-full justify-start"
          onClick={() => onInsert(item.type as ChartType)}
        >
          {item.displayName}
        </Button>
      ))}
    </div>
  );

  return (
    <aside className="w-full space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] lg:w-64">
      <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">添加组件</p>
      {renderGroup("基础组件", basic)}
      {extended.length ? renderGroup("扩展组件", extended) : null}
    </aside>
  );
}
