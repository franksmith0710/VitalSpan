import { ChevronDown, LayoutDashboard, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Linkage } from "./dashboardFilterUtils";
import { LinkageRulesPanel } from "./LinkageRulesPanel";
import type { LayoutWidget } from "./layoutUtils";

type DashboardContextInspectorProps = {
  dashboardId: string;
  widgetCount: number;
  filterWidgetCount: number;
  widgets: LayoutWidget[];
  linkage: Linkage | null;
  effectiveLinkage: Linkage;
  onLinkageChange: (linkage: Linkage) => void;
  embedded?: boolean;
  linkageDefaultOpen?: boolean;
};

const STEPS = [
  "从左侧拖入图表或筛选器",
  "选中组件，在本栏配置数据与字段",
  "点击「保存布局」写入看板",
] as const;

export function DashboardContextInspector({
  dashboardId,
  widgetCount,
  filterWidgetCount,
  widgets,
  linkage,
  effectiveLinkage,
  onLinkageChange,
  embedded = false,
  linkageDefaultOpen = false,
}: DashboardContextInspectorProps) {
  const hasFilters = effectiveLinkage.filters.length > 0;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", embedded && "h-full")}>
      <div className="shrink-0 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
            <LayoutDashboard className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">看板</p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              {widgetCount > 0 ? `${widgetCount} 个组件` : "画布为空"}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-6 text-center dark:border-gray-700 dark:bg-white/[0.02]">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-gray-400 shadow-theme-xs dark:bg-white/5 dark:text-gray-500">
            <MousePointerClick className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
            未选中组件
          </p>
          <p className="mt-1 max-w-[240px] text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            点击画布中的图表或筛选器，在此配置属性。
          </p>
        </div>

        <ol className="mt-4 space-y-2">
          {STEPS.map((step, i) => (
            <li
              key={step}
              className="flex gap-2.5 text-theme-xs leading-relaxed text-gray-600 dark:text-gray-400"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-theme-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>

        {filterWidgetCount === 0 ? (
          <p className="mt-4 rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-theme-xs text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
            需要联动筛选？从左侧拖入「筛选器」到画布顶部，配置参数名后会自动作用于全部图表。
          </p>
        ) : null}

        {(hasFilters || linkageDefaultOpen) ? (
          <Collapsible defaultOpen={filterWidgetCount > 0 || linkageDefaultOpen} className="mt-4">
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-theme-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300 dark:hover:bg-white/[0.04]">
              筛选联动（高级）
              <ChevronDown className="size-4 shrink-0 text-gray-400 transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <LinkageRulesPanel
                dashboardId={dashboardId}
                linkage={linkage}
                effectiveLinkage={effectiveLinkage}
                widgets={widgets}
                draftMode
                onLinkageChange={onLinkageChange}
              />
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
  );
}
