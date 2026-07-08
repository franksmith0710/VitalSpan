import { useEffect, useMemo, useState } from "react";
import type { ChartType } from "@/lib/chartViewConfig";
import { fetchChartTypeCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";
import { cn } from "@/lib/utils";
import { widgetChartIcon } from "./widgetIcons";

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

function PaletteTile({
  item,
  onInsert,
}: {
  item: ChartTypeCatalogItem;
  onInsert: (type: ChartType) => void;
}) {
  const Icon = widgetChartIcon(item.type);
  return (
    <button
      type="button"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-3",
        "text-theme-xs font-medium text-gray-700 transition-colors",
        "hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-600",
        "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/20",
        "dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300",
        "dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10 dark:hover:text-brand-400",
      )}
      onClick={() => onInsert(item.type as ChartType)}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
        <Icon className="size-5" aria-hidden />
      </span>
      {item.displayName}
    </button>
  );
}

function PaletteGroup({
  title,
  items,
  onInsert,
}: {
  title: string;
  items: ChartTypeCatalogItem[];
  onInsert: (type: ChartType) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <PaletteTile key={item.type} item={item} onInsert={onInsert} />
        ))}
      </div>
    </div>
  );
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

  return (
    <aside className="w-full shrink-0">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">组件库</h2>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">点击添加到画布</p>
        <div className="mt-4 space-y-5">
          <PaletteGroup title="基础组件" items={basic} onInsert={onInsert} />
          {extended.length ? (
            <PaletteGroup title="扩展组件" items={extended} onInsert={onInsert} />
          ) : null}
        </div>
      </div>
    </aside>
  );
}
