import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChartType } from "@/lib/chartViewConfig";
import { setChartTypeDragData } from "@/lib/dashboardDnd";
import {
  buildFallbackCatalogItems,
  enrichChartCatalogItems,
  fetchChartTypeCatalog,
  getChartTypeDisplayName,
  type ChartTypeCatalogItem,
} from "@/lib/chartRegistry";
import {
  buildDeStylePaletteSections,
  type DePaletteSection,
} from "@/lib/chartPaletteTaxonomy";
import { cn } from "@/lib/utils";
import { chartTypeIcon } from "@/lib/chartTypeIcons";
import {
  ChartExploreCatalogTrigger,
  ChartExploreDrawer,
} from "@/components/dashboard/ChartExploreDrawer";

type ChartPickerPopoverProps = {
  onInsert: (type: ChartType) => void;
  onInserted?: () => void;
  onPaletteDragStart?: () => void;
  onPaletteDragEnd?: () => void;
  /** 选择态高亮（新建组件等场景） */
  selectedType?: ChartType;
  /** 默认 true；对话框内选类型时可关闭拖拽 */
  enableDrag?: boolean;
  className?: string;
};

function ChartTypeTile({
  item,
  onInsert,
  onInserted,
  onPaletteDragStart,
  onPaletteDragEnd,
  selected = false,
  enableDrag = true,
}: {
  item: ChartTypeCatalogItem;
  onInsert: (type: ChartType) => void;
  onInserted?: () => void;
  onPaletteDragStart?: () => void;
  onPaletteDragEnd?: () => void;
  selected?: boolean;
  enableDrag?: boolean;
}) {
  const chartType = item.type as ChartType;
  const label = item.displayName || getChartTypeDisplayName(item.type);
  const Icon = chartTypeIcon(item.type);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={enableDrag}
      aria-pressed={selected}
      onDragStart={(e) => {
        if (!enableDrag) return;
        setChartTypeDragData(e.dataTransfer, chartType);
        onPaletteDragStart?.();
        e.stopPropagation();
      }}
      onDragEnd={() => {
        if (!enableDrag) return;
        onPaletteDragEnd?.();
      }}
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
        "flex flex-col items-center gap-1.5 rounded-lg border p-1.5 text-center transition-colors",
        enableDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        selected
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:border-brand-500/60 dark:bg-brand-500/10 dark:ring-brand-500/25"
          : "border-transparent hover:border-brand-200 hover:bg-brand-50/60 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10",
        "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/20",
      )}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-brand-500 dark:bg-white/[0.06] dark:text-brand-400">
        <Icon className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="line-clamp-2 w-full text-[11px] leading-tight text-gray-700 dark:text-gray-300">
        {label}
      </span>
    </div>
  );
}

function SectionGrid({
  section,
  onInsert,
  onInserted,
  onPaletteDragStart,
  onPaletteDragEnd,
  selectedType,
  enableDrag,
}: {
  section: DePaletteSection;
  onInsert: (type: ChartType) => void;
  onInserted?: () => void;
  onPaletteDragStart?: () => void;
  onPaletteDragEnd?: () => void;
  selectedType?: ChartType;
  enableDrag?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{section.label}</h3>
      <div className="grid grid-cols-4 gap-1">
        {section.items.map((item) => (
          <ChartTypeTile
            key={item.type}
            item={item}
            onInsert={onInsert}
            onInserted={onInserted}
            onPaletteDragStart={onPaletteDragStart}
            onPaletteDragEnd={onPaletteDragEnd}
            selected={selectedType === item.type}
            enableDrag={enableDrag}
          />
        ))}
      </div>
    </section>
  );
}

/** DataEase 风格：左侧分类导航 + 右侧连续滚动分区 */
export function ChartPickerPopover({
  onInsert,
  onInserted,
  onPaletteDragStart,
  onPaletteDragEnd,
  selectedType,
  enableDrag = true,
  className,
}: ChartPickerPopoverProps) {
  const [catalog, setCatalog] = useState<ChartTypeCatalogItem[] | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>("quota");
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const scrollingByNavRef = useRef(false);

  useEffect(() => {
    void fetchChartTypeCatalog()
      .then((items) => setCatalog(Array.isArray(items) ? enrichChartCatalogItems(items) : null))
      .catch(() => setCatalog(null));
  }, []);

  const sections = useMemo(() => {
    const items = catalog?.length ? catalog : buildFallbackCatalogItems();
    return buildDeStylePaletteSections(enrichChartCatalogItems(items));
  }, [catalog]);

  const setSectionRef = useCallback((id: string, node: HTMLElement | null) => {
    if (node) sectionRefs.current.set(id, node);
    else sectionRefs.current.delete(id);
  }, []);

  useEffect(() => {
    if (sections.length === 0) return;
    if (!sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0]!.id);
    }
  }, [sections, activeSectionId]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollingByNavRef.current) return;
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0]?.target.getAttribute("data-section-id");
        if (top) setActiveSectionId(top);
      },
      { root, threshold: 0.15, rootMargin: "-8px 0px -55% 0px" },
    );

    for (const section of sections) {
      const node = sectionRefs.current.get(section.id);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    const node = sectionRefs.current.get(sectionId);
    if (!node || !scrollRef.current) return;
    setActiveSectionId(sectionId);
    scrollingByNavRef.current = true;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      scrollingByNavRef.current = false;
    }, 400);
  };

  return (
    <>
    <div
      className={cn("flex h-[min(70vh,400px)] min-h-[360px]", className)}
      data-testid="chart-picker-popover"
    >
      <nav
        className="flex w-[84px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-gray-200 py-1 pr-1 dark:border-gray-800"
        aria-label="图表分类"
      >
        {sections.map((section) => {
          const active = section.id === activeSectionId;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={cn(
                "rounded-md px-2 py-2 text-left text-[11px] leading-snug transition-colors",
                active
                  ? "bg-brand-50 font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5",
              )}
            >
              {section.label}
            </button>
          );
        })}
      </nav>

      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-5">
          {sections.map((section) => (
            <div
              key={section.id}
              ref={(node) => setSectionRef(section.id, node)}
              data-section-id={section.id}
              className="scroll-mt-1"
            >
              <SectionGrid
                section={section}
                onInsert={onInsert}
                onInserted={onInserted}
                onPaletteDragStart={onPaletteDragStart}
                onPaletteDragEnd={onPaletteDragEnd}
                selectedType={selectedType}
                enableDrag={enableDrag}
              />
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-gray-200 pt-2 dark:border-gray-800">
          <ChartExploreCatalogTrigger
            dense
            onOpen={() => {
              setCatalogOpen(true);
              onInserted?.();
            }}
          />
        </div>
      </div>
    </div>
    <ChartExploreDrawer open={catalogOpen} onOpenChange={setCatalogOpen} />
    </>
  );
}
