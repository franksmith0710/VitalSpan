import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardConfigSection } from "./DashboardConfigSection";
import type { Linkage } from "./dashboardFilterUtils";
import { LinkageRulesPanel } from "./LinkageRulesPanel";
import {
  formatMetricValue,
  type DashboardStyleConfig,
} from "./dashboardStyleConfig";
import { DashboardCanvasBackgroundPanel } from "./dashboardCanvasBackgroundPanel";
import { DashboardOverallConfigPanel } from "./dashboardOverallConfigPanel";
import { DashboardThemeStylePanel } from "./dashboardThemeStylePanel";
import { DeAttrField, DeSegmentGroup } from "./dashboardInspectorUi";
import { ColorField } from "@/components/ui/color-field";
import type { LayoutWidget } from "./layoutUtils";
import { CHART_PALETTE_PRESETS } from "@/lib/chartPalette";
import { Checkbox } from "@/components/ui/checkbox";
import { DEFAULT_DRILL_LEVEL_COLORS } from "./dashboardChromeConfig";
import type { ColorScheme, SpacingMode } from "./dashboardStyleConfig";
import { SpacingModeToggle } from "./inspectorSpacing";

type PatchFn = (patch: Partial<DashboardStyleConfig>) => void;

type StyleSectionProps = {
  styleConfig: DashboardStyleConfig;
  patchStyle: PatchFn;
  isPixelLayout: boolean;
  onSwitchColorScheme?: (scheme: ColorScheme) => void;
};

export function DashboardStyleSections({
  styleConfig,
  patchStyle,
  isPixelLayout,
  onSwitchColorScheme,
}: StyleSectionProps) {
  const colorScheme = styleConfig.colorScheme ?? "light";

  return (
    <>
      <DashboardConfigSection
        title="仪表板风格"
        defaultOpen
        data-testid="dashboard-theme-section"
      >
        <DashboardThemeStylePanel
          colorScheme={colorScheme}
          onSwitchColorScheme={onSwitchColorScheme}
          onPatchColorScheme={(scheme) => patchStyle({ colorScheme: scheme })}
        />
      </DashboardConfigSection>

      <DashboardConfigSection title="整体配置" defaultOpen data-testid="dashboard-overall-config">
        <DashboardOverallConfigPanel
          styleConfig={styleConfig}
          patchStyle={patchStyle}
          isPixelLayout={isPixelLayout}
        />
      </DashboardConfigSection>

      <DashboardConfigSection title="仪表板背景" data-testid="dashboard-canvas-background">
        <DashboardCanvasBackgroundPanel styleConfig={styleConfig} patchStyle={patchStyle} />
      </DashboardConfigSection>
    </>
  );
}

export function DashboardWidgetStyleSections({ styleConfig, patchStyle }: StyleSectionProps) {
  const ws = styleConfig.widgetStyle ?? {};
  const ts = styleConfig.titleStyle ?? {};
  const nf = styleConfig.numberFormat ?? {};
  const fc = styleConfig.filterChromeStyle ?? {};
  const fctrl = styleConfig.filterControlStyle ?? {};

  const patchWidgetStyle = (patch: Partial<typeof ws>) =>
    patchStyle({ widgetStyle: { ...ws, ...patch } });
  const patchTitleStyle = (patch: Partial<typeof ts>) =>
    patchStyle({ titleStyle: { ...ts, ...patch } });
  const patchNumberFormat = (patch: Partial<typeof nf>) =>
    patchStyle({ numberFormat: { ...nf, ...patch } });

  return (
    <>
      <DashboardConfigSection title="图表样式">
        <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <ColorField
              compact
              allowClear
              label="背景色"
              value={ws.background ?? ""}
              onChange={(color) => patchWidgetStyle({ background: color })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-theme-xs text-gray-500">背景模糊 (px)</Label>
            <Input
              type="number"
              min={0}
              max={48}
              className="h-9"
              value={ws.backdropBlur ?? ""}
              onChange={(e) =>
                patchWidgetStyle({ backdropBlur: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-theme-xs text-gray-500">背景图片 URL</Label>
            <Input
              className="h-9"
              placeholder="https://…"
              value={ws.backgroundImage ?? ""}
              onChange={(e) => patchWidgetStyle({ backgroundImage: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1">
            <ColorField
              compact
              allowClear
              label="边框色"
              value={ws.borderColor ?? ""}
              onChange={(color) => patchWidgetStyle({ borderColor: color })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-theme-xs text-gray-500">透明度</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.1}
              className="h-9"
              value={ws.opacity ?? ""}
              onChange={(e) =>
                patchWidgetStyle({ opacity: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
        </div>

        <SpacingModeToggle
          label="内边距模式"
          mode={ws.paddingMode ?? "unified"}
          onChange={(paddingMode) => patchWidgetStyle({ paddingMode })}
        />
        {(ws.paddingMode ?? "unified") === "unified" ? (
          <div className="space-y-1">
            <Label className="text-theme-xs text-gray-500">内边距 (px)</Label>
            <Input
              type="number"
              min={0}
              max={64}
              className="h-9"
              value={ws.padding ?? ""}
              onChange={(e) =>
                patchWidgetStyle({ padding: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-theme-xs text-gray-500">
                  {key === "paddingTop" ? "上" : key === "paddingRight" ? "右" : key === "paddingBottom" ? "下" : "左"}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={64}
                  className="h-9"
                  value={ws[key] ?? ""}
                  onChange={(e) =>
                    patchWidgetStyle({ [key]: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            ))}
          </div>
        )}

        <SpacingModeToggle
          label="圆角模式"
          mode={ws.radiusMode ?? "unified"}
          onChange={(radiusMode) => patchWidgetStyle({ radiusMode })}
        />
        {(ws.radiusMode ?? "unified") === "unified" ? (
          <div className="space-y-1">
            <Label className="text-theme-xs text-gray-500">圆角 (px)</Label>
            <Input
              type="number"
              min={0}
              max={48}
              className="h-9"
              value={ws.borderRadius ?? ""}
              onChange={(e) =>
                patchWidgetStyle({ borderRadius: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["borderRadiusTopLeft", "左上"],
                ["borderRadiusTopRight", "右上"],
                ["borderRadiusBottomLeft", "左下"],
                ["borderRadiusBottomRight", "右下"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label className="text-theme-xs text-gray-500">{label}</Label>
                <Input
                  type="number"
                  min={0}
                  max={48}
                  className="h-9"
                  value={ws[key] ?? ""}
                  onChange={(e) =>
                    patchWidgetStyle({ [key]: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
            ))}
          </div>
        )}
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="图表配色">
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CHART_PALETTE_PRESETS).map(([id, colors]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded-lg border p-2 text-left",
                styleConfig.paletteId === id || (!styleConfig.paletteId && id === "default")
                  ? "border-brand-500"
                  : "border-gray-200 dark:border-gray-700",
              )}
              onClick={() => patchStyle({ paletteId: id, paletteColors: [...colors] })}
            >
              <span className="text-theme-xs text-gray-600 dark:text-gray-400">
                {id === "default" ? "默认" : id === "tech" ? "科技" : id === "business" ? "商务" : "暖色"}
              </span>
              <div className="mt-1 flex gap-1">
                {colors.slice(0, 5).map((c) => (
                  <span key={c} className="size-3 rounded-full" style={{ background: c }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="图表标题">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-theme-xs text-gray-500">字号</Label>
            <Input
              type="number"
              min={10}
              max={32}
              className="h-9"
              value={ts.fontSize ?? ""}
              onChange={(e) =>
                patchTitleStyle({ fontSize: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>
          <div className="space-y-1">
            <ColorField
              compact
              allowClear
              label="颜色"
              value={ts.color ?? ""}
              onChange={(color) => patchTitleStyle({ color })}
            />
          </div>
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="查询组件">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-theme-xs text-gray-500">标题位置</Label>
            <Select
              value={fc.titlePosition ?? "top"}
              onValueChange={(v) =>
                patchStyle({ filterChromeStyle: { ...fc, titlePosition: v as "top" | "left" } })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">上方</SelectItem>
                <SelectItem value="left">左侧</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <ColorField
              compact
              allowClear
              label="标题颜色"
              value={fc.titleColor ?? ""}
              onChange={(color) =>
                patchStyle({ filterChromeStyle: { ...fc, titleColor: color } })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-theme-xs text-gray-500">控件高度</Label>
            <Input
              type="number"
              min={28}
              max={48}
              className="h-9"
              value={fctrl.height ?? ""}
              onChange={(e) =>
                patchStyle({
                  filterControlStyle: {
                    ...fctrl,
                    height: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-theme-xs text-gray-500">控件圆角</Label>
            <Input
              type="number"
              min={0}
              max={24}
              className="h-9"
              value={fctrl.borderRadius ?? ""}
              onChange={(e) =>
                patchStyle({
                  filterControlStyle: {
                    ...fctrl,
                    borderRadius: e.target.value ? Number(e.target.value) : undefined,
                  },
                })
              }
            />
          </div>
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="数字内容格式" data-testid="dashboard-number-format">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-theme-xs text-gray-500">格式类型</Label>
              <Select
                value={nf.type ?? "auto"}
                onValueChange={(v) =>
                  patchNumberFormat({ type: v as "auto" | "number" | "percent" | "currency" })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自动</SelectItem>
                  <SelectItem value="number">数值</SelectItem>
                  <SelectItem value="percent">百分比</SelectItem>
                  <SelectItem value="currency">货币</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-theme-xs text-gray-500">单位语言</Label>
              <Select value="zh" disabled>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-theme-xs text-gray-500">小数位</Label>
              <Input
                type="number"
                min={0}
                max={8}
                className="h-9"
                value={nf.decimals ?? ""}
                onChange={(e) =>
                  patchNumberFormat({ decimals: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-theme-xs text-gray-500">数量单位</Label>
              <Select
                value={
                  !nf.unit
                    ? "none"
                    : nf.unit === "千" || nf.unit === "万" || nf.unit === "亿"
                      ? nf.unit
                      : "custom"
                }
                onValueChange={(v) => {
                  if (v === "none") patchNumberFormat({ unit: undefined });
                  else if (v === "千" || v === "万" || v === "亿") patchNumberFormat({ unit: v });
                  else patchNumberFormat({ unit: nf.unit ?? "" });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  <SelectItem value="千">千</SelectItem>
                  <SelectItem value="万">万</SelectItem>
                  <SelectItem value="亿">亿</SelectItem>
                  <SelectItem value="custom">自定义后缀</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-theme-xs text-gray-500">单位后缀</Label>
            <Input
              className="h-9"
              placeholder="如：元、次"
              value={nf.unit ?? ""}
              onChange={(e) => patchNumberFormat({ unit: e.target.value || undefined })}
            />
          </div>
          <label className="flex items-center gap-2 text-theme-xs text-gray-600 dark:text-gray-400">
            <Checkbox
              checked={nf.thousandSeparator !== false}
              onCheckedChange={(checked) =>
                patchNumberFormat({ thousandSeparator: checked === true })
              }
            />
            千分符
          </label>
          <p
            className="rounded-md bg-gray-50 px-2.5 py-2 text-theme-xs text-gray-600 dark:bg-white/[0.04] dark:text-gray-400"
            data-testid="dashboard-number-format-preview"
          >
            示例{formatMetricValue(20_000_000, nf)}
          </p>
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="高级样式设置">
        <div className="space-y-3">
          <div className="space-y-1">
            <ColorField
              compact
              allowClear
              label="联动/钻取图标色"
              value={styleConfig.actionIconColor ?? ""}
              onChange={(color) => patchStyle({ actionIconColor: color })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-theme-xs text-gray-500">钻取层级展示颜色</Label>
            <div className="grid grid-cols-3 gap-2">
              {DEFAULT_DRILL_LEVEL_COLORS.map((fallback, index) => (
                <ColorField
                  key={index}
                  compact
                  allowClear
                  label={`L${index + 1}`}
                  value={styleConfig.drillLevelColors?.[index] ?? fallback}
                  onChange={(color) => {
                    const next = [...(styleConfig.drillLevelColors ?? DEFAULT_DRILL_LEVEL_COLORS)];
                    next[index] = color;
                    patchStyle({ drillLevelColors: next.filter(Boolean) });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </DashboardConfigSection>
    </>
  );
}

type LinkageSectionProps = {
  dashboardId: string;
  filterWidgetCount: number;
  widgets: LayoutWidget[];
  linkage: Linkage | null;
  effectiveLinkage: Linkage;
  onLinkageChange: (linkage: Linkage) => void;
  linkageDefaultOpen?: boolean;
};

export function DashboardLinkageSection({
  dashboardId,
  filterWidgetCount,
  widgets,
  linkage,
  effectiveLinkage,
  onLinkageChange,
  linkageDefaultOpen,
}: LinkageSectionProps) {
  return (
    <DashboardConfigSection
      title="筛选联动"
      defaultOpen={filterWidgetCount > 0 || linkageDefaultOpen}
      data-testid="dashboard-linkage-section"
    >
      {effectiveLinkage.filters.length === 0 ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          暂无筛选器。从左侧拖入筛选组件后，可在此配置联动规则。
        </p>
      ) : (
        <LinkageRulesPanel
          dashboardId={dashboardId}
          linkage={linkage}
          effectiveLinkage={effectiveLinkage}
          widgets={widgets}
          draftMode
          onLinkageChange={onLinkageChange}
        />
      )}
    </DashboardConfigSection>
  );
}
