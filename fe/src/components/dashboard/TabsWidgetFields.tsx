import { Filter, ImageIcon, Plus, Trash2, Type } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { LayoutWidget, TabsHeadStyleConfig, TabsWidgetConfig } from "./layoutUtils";
import { getTabChildWidgets } from "./layoutUtils";
import { DeAttrForm, DE_INPUT } from "./dashboardInspectorUi";
import { InspectorNestedSection } from "./inspectorNestedSection";
import { InspectorPanelSection } from "./inspector-panel-section";
import { ChartBackgroundStyleFields } from "./chartStyleFields";
import { InspectorInlineColorRow } from "./inspectorCompact";
import { DeProgressSlider } from "./deAttrSlider";
import { widgetChartIcon, WIDGET_CHART_LABELS } from "./widgetIcons";

const MAX_PANES = 8;

function tabChildTypeLabel(widget: LayoutWidget): string {
  if (widget.type === "chart") {
    return WIDGET_CHART_LABELS[widget.chartConfig?.chartType ?? "bar"] ?? "图表";
  }
  if (widget.type === "media") return "图片";
  if (widget.type === "text") return "富文本";
  if (widget.type === "filter") return "筛选器";
  return widget.type;
}

function TabChildTypeIcon({ widget }: { widget: LayoutWidget }) {
  const className = "size-3.5 shrink-0 text-gray-500 dark:text-gray-400";
  if (widget.type === "media") return <ImageIcon className={className} aria-hidden />;
  if (widget.type === "text") return <Type className={className} aria-hidden />;
  if (widget.type === "filter") return <Filter className={className} aria-hidden />;
  if (widget.type === "chart") {
    const Icon = widgetChartIcon(widget.chartConfig?.chartType ?? "bar");
    return <Icon className={className} aria-hidden />;
  }
  return null;
}

export type TabsPaneListProps = {
  widget: LayoutWidget & { tabsConfig: TabsWidgetConfig };
  allWidgets: LayoutWidget[];
  selectedChildId?: string | null;
  onChange: (tabsConfig: TabsWidgetConfig) => void;
  onSelectChild?: (childId: string) => void;
};

export function TabsPaneList({
  widget,
  allWidgets,
  selectedChildId,
  onChange,
  onSelectChild,
}: TabsPaneListProps) {
  const cfg = widget.tabsConfig;
  const totalChildren = cfg.panes.reduce((sum, pane) => sum + pane.childWidgetIds.length, 0);

  const updatePaneTitle = (paneId: string, title: string) => {
    onChange({
      ...cfg,
      panes: cfg.panes.map((p) => (p.id === paneId ? { ...p, title } : p)),
    });
  };

  const setActivePane = (paneId: string) => {
    onChange({ ...cfg, activePaneId: paneId });
  };

  const focusChild = (paneId: string, childId: string) => {
    if (cfg.activePaneId !== paneId) {
      onChange({ ...cfg, activePaneId: paneId });
    }
    onSelectChild?.(childId);
  };

  const addPane = () => {
    if (cfg.panes.length >= MAX_PANES) return;
    const id = crypto.randomUUID();
    onChange({
      ...cfg,
      panes: [...cfg.panes, { id, title: `页签 ${cfg.panes.length + 1}`, childWidgetIds: [] }],
      activePaneId: id,
    });
  };

  const removePane = (paneId: string) => {
    if (cfg.panes.length <= 1) return;
    const panes = cfg.panes.filter((p) => p.id !== paneId);
    const activePaneId =
      cfg.activePaneId === paneId ? panes[0]?.id ?? panes[panes.length - 1].id : cfg.activePaneId;
    onChange({ ...cfg, panes, activePaneId });
  };

  return (
    <InspectorPanelSection
      title="页签列表"
      description={`共 ${cfg.panes.length} 个页签 · ${totalChildren} 个组件`}
      action={
        cfg.panes.length < MAX_PANES ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2.5 text-theme-xs"
            onClick={addPane}
          >
            <Plus className="size-3.5" aria-hidden />
            添加
          </Button>
        ) : null
      }
    >
      <div className="space-y-1.5">
        {cfg.panes.map((pane, index) => {
          const active = pane.id === cfg.activePaneId;
          const childCount = pane.childWidgetIds.length;
          const children = getTabChildWidgets(allWidgets, widget.id, pane.id);
          return (
            <div key={pane.id} className="space-y-1">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors",
                  active
                    ? "border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/10"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-white/[0.02]",
                )}
              >
                <button
                  type="button"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums transition-colors",
                    active
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15",
                  )}
                  aria-label={`切换到页签 ${index + 1}`}
                  aria-pressed={active}
                  onPointerDown={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                }}
                onClick={() => setActivePane(pane.id)}
                >
                  {index + 1}
                </button>
                <Input
                  id={`tab-pane-${pane.id}`}
                  className={cn(DE_INPUT, "h-8 min-w-0 flex-1")}
                  value={pane.title}
                  onChange={(e) => updatePaneTitle(pane.id, e.target.value)}
                  aria-label={`页签 ${index + 1} 名称`}
                />
                {childCount > 0 && onSelectChild ? (
                  <button
                    type="button"
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums transition-colors",
                      "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand-600",
                      "dark:bg-white/10 dark:text-gray-300 dark:hover:bg-brand-500/15 dark:hover:text-brand-400",
                    )}
                    aria-label={`查看页签 ${pane.title} 内的 ${childCount} 个组件`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                    }}
                    onClick={() => focusChild(pane.id, children[0]!.id)}
                  >
                    {childCount} 项
                  </button>
                ) : (
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
                      "text-gray-400 dark:text-gray-500",
                    )}
                  >
                    {childCount} 项
                  </span>
                )}
                {cfg.panes.length > 1 ? (
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-7 shrink-0 text-gray-400 hover:text-error-500"
                    aria-label={`删除页签 ${pane.title}`}
                    onClick={() => removePane(pane.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                ) : null}
              </div>
              {children.length > 0 ? (
                <div className="space-y-0.5 pl-2">
                  {children.map((child) => {
                    const childSelected = selectedChildId === child.id;
                    const typeLabel = tabChildTypeLabel(child);
                    return (
                      <button
                        key={child.id}
                        type="button"
                        className={cn(
                          "flex w-full min-w-0 items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                          childSelected
                            ? "border-brand-200 bg-brand-50/70 dark:border-brand-500/30 dark:bg-brand-500/10"
                            : "border-transparent bg-gray-50/80 hover:border-gray-200 hover:bg-white dark:bg-white/[0.03] dark:hover:border-gray-700 dark:hover:bg-white/[0.05]",
                        )}
                        aria-label={`配置 ${child.title || typeLabel}`}
                        aria-current={childSelected ? "true" : undefined}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                        }}
                        onClick={() => focusChild(pane.id, child.id)}
                      >
                        <TabChildTypeIcon widget={child} />
                        <span className="min-w-0 flex-1 truncate text-theme-xs font-medium text-gray-800 dark:text-white/90">
                          {child.title || typeLabel}
                        </span>
                        <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                          {typeLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </InspectorPanelSection>
  );
}

type TabsStyleFieldsProps = {
  widget: LayoutWidget & { tabsConfig: TabsWidgetConfig };
  onChange: (tabsConfig: TabsWidgetConfig) => void;
  onTitleChange?: (title: string) => void;
};

export function TabsStyleFields({ widget, onChange, onTitleChange }: TabsStyleFieldsProps) {
  const cfg = widget.tabsConfig;
  const widgetStyle = cfg.widgetStyle ?? {};
  const headStyle = cfg.headStyle ?? {};

  const patchWidgetStyle = (patch: Partial<typeof widgetStyle>) => {
    const current = widget.tabsConfig;
    onChange({
      ...current,
      widgetStyle: { ...(current.widgetStyle ?? {}), ...patch },
    });
  };

  const patchHeadStyle = (patch: Partial<TabsHeadStyleConfig>) => {
    onChange({
      ...cfg,
      headStyle: { ...headStyle, ...patch },
    });
  };

  return (
    <DeAttrForm>
      {onTitleChange ? (
        <div className="border-b border-gray-100 px-3 py-3 dark:border-white/[0.06]">
          <Label htmlFor={`tabs-title-${widget.id}`} className="mb-2 block text-theme-xs font-medium text-gray-700 dark:text-gray-300">
            组件名称
          </Label>
          <Input
            id={`tabs-title-${widget.id}`}
            className={cn(DE_INPUT, "h-9")}
            value={widget.title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
      ) : null}

      <div className="px-3 py-2">
        <ChartBackgroundStyleFields
          scope="chart"
          density="wide"
          value={widgetStyle}
          onChange={patchWidgetStyle}
          border={{
            show: widgetStyle.borderEnabled,
            color: widgetStyle.borderColor,
            width: widgetStyle.borderWidth,
            style: widgetStyle.borderStyle,
          }}
          onBorderChange={(patch) => {
            const current = widget.tabsConfig;
            const currentStyle = current.widgetStyle ?? {};
            onChange({
              ...current,
              widgetStyle: {
                ...currentStyle,
                borderEnabled: patch.show ?? currentStyle.borderEnabled,
                borderColor: patch.color ?? currentStyle.borderColor,
                borderWidth: patch.width ?? currentStyle.borderWidth,
                borderStyle: patch.style ?? currentStyle.borderStyle,
              },
            });
          }}
        />
      </div>

      <InspectorNestedSection title="页签栏" className="px-3">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">字号</Label>
            <DeProgressSlider
              min={10}
              max={18}
              value={headStyle.fontSize ?? 14}
              onChange={(fontSize) => patchHeadStyle({ fontSize })}
            />
          </div>
          <InspectorInlineColorRow
            label="激活色"
            value={headStyle.activeColor ?? ""}
            onChange={(activeColor) => patchHeadStyle({ activeColor: activeColor || undefined })}
          />
          <InspectorInlineColorRow
            label="未激活色"
            value={headStyle.inactiveColor ?? ""}
            onChange={(inactiveColor) => patchHeadStyle({ inactiveColor: inactiveColor || undefined })}
          />
          <InspectorInlineColorRow
            label="栏背景"
            value={headStyle.barBackground ?? ""}
            onChange={(barBackground) => patchHeadStyle({ barBackground: barBackground || undefined })}
          />
        </div>
      </InspectorNestedSection>
    </DeAttrForm>
  );
}
