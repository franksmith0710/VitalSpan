import { LayoutDashboard, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SURFACE_TABS, VIZ_TEMPLATES_HUB } from "@/components/dashboard/templates/templateLabels";
import { TEMPLATE_CATEGORIES, type VizSurfaceKind } from "@/lib/dashboardTemplates";
import { cn } from "@/lib/utils";

const FILTER_LABEL_CLASS =
  "w-10 shrink-0 text-theme-xs font-medium text-gray-500 dark:text-gray-400";

const SEGMENTED_SHELL_CLASS =
  "inline-flex rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-800 dark:bg-white/[0.04]";

type VizTemplatesHubFiltersProps = {
  surfaceKind: VizSurfaceKind;
  categoryKey: string | null;
  onSurfaceKindChange: (kind: VizSurfaceKind) => void;
  onCategoryChange: (key: string | null) => void;
};

export function VizTemplatesHubFilters({
  surfaceKind,
  categoryKey,
  onSurfaceKindChange,
  onCategoryChange,
}: VizTemplatesHubFiltersProps) {
  return (
    <div
      className="flex w-full min-w-0 flex-col gap-2.5"
      data-testid="viz-templates-hub-filters"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={FILTER_LABEL_CLASS}>{VIZ_TEMPLATES_HUB.filterSurfaceLabel}</span>
        <div
          role="tablist"
          aria-label={VIZ_TEMPLATES_HUB.filterSurfaceAriaLabel}
          className={SEGMENTED_SHELL_CLASS}
        >
          {SURFACE_TABS.map((tab) => {
            const Icon = tab.key === "data-screen" ? Monitor : LayoutDashboard;
            const active = surfaceKind === tab.key;
            return (
              <Button
                key={tab.key}
                type="button"
                size="sm"
                role="tab"
                aria-selected={active}
                variant={active ? "primary" : "ghost"}
                className={cn("h-8 shadow-none", !active && "text-gray-600 dark:text-gray-400")}
                onClick={() => onSurfaceKindChange(tab.key)}
              >
                <Icon className="size-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={FILTER_LABEL_CLASS}>{VIZ_TEMPLATES_HUB.filterCategoryLabel}</span>
        <div
          role="group"
          aria-label={VIZ_TEMPLATES_HUB.filterCategoryAriaLabel}
          className={cn(SEGMENTED_SHELL_CLASS, "flex min-w-0 flex-wrap gap-0.5")}
        >
          <Button
            type="button"
            size="sm"
            variant={categoryKey === null ? "subtle" : "ghost"}
            className="h-8 shadow-none"
            onClick={() => onCategoryChange(null)}
          >
            {VIZ_TEMPLATES_HUB.allCategories}
          </Button>
          {TEMPLATE_CATEGORIES.map((cat) => (
            <Button
              key={cat.key}
              type="button"
              size="sm"
              variant={categoryKey === cat.key ? "subtle" : "ghost"}
              className="h-8 shadow-none"
              onClick={() => onCategoryChange(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
