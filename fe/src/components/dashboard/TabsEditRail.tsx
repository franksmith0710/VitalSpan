import { cn } from "@/lib/utils";
import type { LayoutWidget, TabsWidgetConfig } from "./layoutUtils";
import { ChartInspectorTabs } from "./ChartInspectorTabs";
import { WidgetInspectorDelete } from "./widget-inspector-delete";
import { TabsPaneList, TabsStyleFields } from "./TabsWidgetFields";
import { WidgetRailPanelHeader } from "./widgetRailChrome";

type TabsEditRailProps = {
  widget: LayoutWidget & { tabsConfig: TabsWidgetConfig };
  allWidgets: LayoutWidget[];
  selectedChildId?: string | null;
  onChange: (tabsConfig: TabsWidgetConfig) => void;
  onSelectChild?: (childId: string) => void;
  onTitleChange?: (title: string) => void;
  onDelete?: () => void;
  onRailCollapse?: () => void;
  className?: string;
};

export function TabsEditRail({
  widget,
  allWidgets,
  selectedChildId,
  onChange,
  onSelectChild,
  onTitleChange,
  onDelete,
  onRailCollapse,
  className,
}: TabsEditRailProps) {
  const cfg = widget.tabsConfig;
  const activePane = cfg.panes.find((p) => p.id === cfg.activePaneId);

  return (
    <div className={cn("flex h-full min-h-0 w-full flex-col bg-white dark:bg-gray-900", className)}>
      <WidgetRailPanelHeader
        title={widget.title || "页签"}
        subtitle="Tab 容器"
        onCollapse={onRailCollapse}
        collapseAriaLabel="收起配置"
      />

      <ChartInspectorTabs
        className="min-h-0 flex-1"
        scrollMode="parent"
        defaultTab="data"
        tabs={["data", "style"]}
        data={
          <div className="space-y-3 px-3 py-2">
            <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3 dark:border-brand-500/20 dark:bg-brand-500/10">
              <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                选中页签后插入组件
              </p>
              <p className="mt-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                从顶部工具栏添加，或将组件拖入画布页签区域。点击下方子组件可跳转其配置栏。当前激活：
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {activePane?.title ?? "—"}
                </span>
              </p>
            </div>
            <TabsPaneList
              widget={widget}
              allWidgets={allWidgets}
              selectedChildId={selectedChildId}
              onChange={onChange}
              onSelectChild={onSelectChild}
            />
          </div>
        }
        style={<TabsStyleFields widget={widget} onChange={onChange} onTitleChange={onTitleChange} />}
      />

      {onDelete ? (
        <div className="shrink-0 border-t border-gray-200 px-3 py-2 dark:border-gray-800">
          <WidgetInspectorDelete widgetTitle={widget.title} onDelete={onDelete} embedded />
        </div>
      ) : null}
    </div>
  );
}
