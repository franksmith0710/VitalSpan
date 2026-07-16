import {
  DASHBOARD_CONFIG_RAIL_CONTENT_CLASS,
  DASHBOARD_EDIT_RAIL_SCROLL_CLASS,
  DASHBOARD_EDIT_RAIL_SCROLL_CLIP_CLASS,
} from "./dashboardEditRailLayout";
import {
  DashboardStyleSections,
  DashboardWidgetStyleSections,
} from "./dashboardConfigPanels";
import type { DashboardStyleConfig, LayoutWidget } from "./layoutUtils";
import {
  applyDashboardStylePatch,
  switchDashboardThemeBundle,
} from "./dashboardThemeVariants";

type DashboardContextInspectorProps = {
  widgetCount: number;
  widgets: LayoutWidget[];
  styleConfig: DashboardStyleConfig;
  onStyleChange: (value: DashboardStyleConfig) => void;
  onWidgetsChange?: (widgets: LayoutWidget[]) => void;
  embedded?: boolean;
  isPixelLayout?: boolean;
};

/** DataEase 对标：画布空白时右侧「仪表板配置」手风琴（§5 样式分组顺序） */
export function DashboardContextInspector({
  widgetCount,
  widgets,
  styleConfig,
  onStyleChange,
  onWidgetsChange,
  embedded = false,
  isPixelLayout = false,
}: DashboardContextInspectorProps) {
  const patchStyle = (patch: Partial<DashboardStyleConfig>) => {
    const bundle = applyDashboardStylePatch(styleConfig, widgets, patch);
    onStyleChange(bundle.styleConfig);
    onWidgetsChange?.(bundle.widgets);
  };

  const sections = (
    <>
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
    </>
  );

  if (embedded) {
    return (
      <div className={DASHBOARD_CONFIG_RAIL_CONTENT_CLASS} data-testid="dashboard-config-inspector">
        {sections}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 h-full w-full flex-col" data-testid="dashboard-config-inspector">
      <div className="shrink-0 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
        <div className={DASHBOARD_CONFIG_RAIL_CONTENT_CLASS}>
          <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">仪表板配置</p>
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            {widgetCount > 0 ? `${widgetCount} 个组件` : "点击画布空白处编辑看板样式"}
          </p>
        </div>
      </div>
      <div className={DASHBOARD_EDIT_RAIL_SCROLL_CLIP_CLASS}>
        <div className={DASHBOARD_EDIT_RAIL_SCROLL_CLASS}>
          <div className={DASHBOARD_CONFIG_RAIL_CONTENT_CLASS}>{sections}</div>
        </div>
      </div>
    </div>
  );
}
