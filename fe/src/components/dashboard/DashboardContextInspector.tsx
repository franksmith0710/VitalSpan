import { cn } from "@/lib/utils";
import type { Linkage } from "./dashboardFilterUtils";
import {
  DashboardLinkageSection,
  DashboardStyleSections,
  DashboardWidgetStyleSections,
} from "./dashboardConfigPanels";
import type { DashboardStyleConfig, LayoutWidget } from "./layoutUtils";
import {
  patchDashboardStyle,
  switchDashboardThemeBundle,
} from "./dashboardThemeVariants";

type DashboardContextInspectorProps = {
  dashboardId: string;
  widgetCount: number;
  filterWidgetCount: number;
  widgets: LayoutWidget[];
  linkage: Linkage | null;
  effectiveLinkage: Linkage;
  onLinkageChange: (linkage: Linkage) => void;
  styleConfig: DashboardStyleConfig;
  onStyleChange: (value: DashboardStyleConfig) => void;
  onWidgetsChange?: (widgets: LayoutWidget[]) => void;
  embedded?: boolean;
  linkageDefaultOpen?: boolean;
  isPixelLayout?: boolean;
};

/** DataEase 对标：画布空白时右侧「仪表板配置」手风琴（§5 样式分组顺序） */
export function DashboardContextInspector({
  dashboardId,
  widgetCount,
  filterWidgetCount,
  widgets,
  linkage,
  effectiveLinkage,
  onLinkageChange,
  styleConfig,
  onStyleChange,
  onWidgetsChange,
  embedded = false,
  linkageDefaultOpen = false,
  isPixelLayout = false,
}: DashboardContextInspectorProps) {
  const patchStyle = (patch: Partial<DashboardStyleConfig>) => {
    onStyleChange(patchDashboardStyle(styleConfig, patch));
  };

  return (
    <div
      className={cn("flex min-h-0 h-full w-full flex-col", embedded && "h-full")}
      data-testid="dashboard-config-inspector"
    >
      {!embedded ? (
        <div className="shrink-0 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">仪表板配置</p>
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {widgetCount > 0 ? `${widgetCount} 个组件` : "点击画布空白处编辑看板样式"}
          </p>
        </div>
      ) : null}

      <div className="dashboard-config-rail min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <DashboardStyleSections
          styleConfig={styleConfig}
          patchStyle={patchStyle}
          isPixelLayout={isPixelLayout}
          onSwitchColorScheme={(scheme) => {
            const bundle = switchDashboardThemeBundle(styleConfig, widgets, scheme);
            onStyleChange(bundle.styleConfig);
            onWidgetsChange?.(bundle.widgets);
          }}
        />
        <DashboardWidgetStyleSections
          styleConfig={styleConfig}
          patchStyle={patchStyle}
          isPixelLayout={isPixelLayout}
        />
        <DashboardLinkageSection
          dashboardId={dashboardId}
          filterWidgetCount={filterWidgetCount}
          widgets={widgets}
          linkage={linkage}
          effectiveLinkage={effectiveLinkage}
          onLinkageChange={onLinkageChange}
          linkageDefaultOpen={linkageDefaultOpen}
        />
      </div>
    </div>
  );
}
