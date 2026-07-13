import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import type { ChartType } from "@/lib/chartViewConfig";
import { setChartTypeDragData } from "@/lib/dashboardDnd";
import { fetchChartTypeCatalog, type ChartTypeCatalogItem } from "@/lib/chartRegistry";
import {
  buildDeStylePaletteSections,
  type DePaletteSection,
} from "@/lib/chartPaletteTaxonomy";
import { FALLBACK_CATALOG_ITEMS } from "@/lib/chartTypeCatalogDisplay";
import { CHART_TYPES_CATALOG_PATH } from "@/lib/chartPaths";
import { cn } from "@/lib/utils";
import { widgetChartIcon } from "./widgetIcons";

type ChartPickerPopoverProps = {
  onInsert: (type: ChartType) => void;
  onInserted?: () => void;
};

function ChartTypeTile({
  item,
  onInsert,
  onInserted,
}: {
  item: ChartTypeCatalogItem;
  onInsert: (type: ChartType) => void;
  onInserted?: () => void;
}) {
  const Icon = widgetChartIcon(item.type);
  const chartType = item.type as ChartType;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => setChartTypeDragData(e.dataTransfer, chartType)}
      onClick={() => {
        onInsert(chartType);
        onInserted?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onInsert(chartType);
          onInserted?.();
        }
      }}
      className={cn(
        "flex cursor-grab flex-col items-center gap-1.5 rounded-lg border border-transparent p-2 text-center transition-colors active:cursor-grabbing",
        "hover:border-brand-200 hover:bg-brand-50/60 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10",
        "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/20",
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="line-clamp-2 w-full text-theme-xs leading-tight text-gray-700 dark:text-gray-300">
        {item.displayName}
      </span>
    </div>
  );
}

function SectionBlock({
  section,
  onInsert,
  onInserted,
}: {
  section: DePaletteSection;
  onInsert: (type: ChartType) => void;
  onInserted?: () => void;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
        {section.label}
      </h3>
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-5">
        {section.items.map((item) => (
          <ChartTypeTile
            key={item.type}
            item={item}
            onInsert={onInsert}
            onInserted={onInserted}
          />
        ))}
      </div>
    </section>
  );
}

/** DataEase 风格宽面板：分区标题 + 图标网格 */
export function ChartPickerPopover({ onInsert, onInserted }: ChartPickerPopoverProps) {
  const [catalog, setCatalog] = useState<ChartTypeCatalogItem[] | null>(null);

  useEffect(() => {
    void fetchChartTypeCatalog()
      .then((items) => setCatalog(Array.isArray(items) ? items : null))
      .catch(() => setCatalog(null));
  }, []);

  const sections = useMemo(() => {
    const items = catalog?.length ? catalog : FALLBACK_CATALOG_ITEMS;
    return buildDeStylePaletteSections(items);
  }, [catalog]);

  return (
    <div className="space-y-4" data-testid="chart-picker-popover">
      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          onInsert={onInsert}
          onInserted={onInserted}
        />
      ))}
      <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
        <Link
          to={CHART_TYPES_CATALOG_PATH}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 text-theme-xs font-medium text-brand-600",
            "hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10",
          )}
        >
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          查看全部类型与字段规则
        </Link>
      </div>
    </div>
  );
}
