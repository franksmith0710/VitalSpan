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
import {
  formatMetricValue,
  SURFACE_COLOR_RECOMMENDED,
  TEXT_COLOR_RECOMMENDED,
  WIDGET_BORDER_RECOMMENDED,
  WIDGET_BORDER_STYLES,
  type DashboardStyleConfig,
} from "./dashboardStyleConfig";
import { DashboardCanvasBackgroundPanel } from "./dashboardCanvasBackgroundPanel";
import { DashboardOverallConfigPanel } from "./dashboardOverallConfigPanel";
import { DashboardThemeStylePanel } from "./dashboardThemeStylePanel";
import { DashboardConfigGridSlider, DashboardConfigSlider } from "./deAttrSlider";
import { ColorField } from "@/components/ui/color-field";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { ColorScheme } from "./dashboardStyleConfig";
import { SpacingModeToggle } from "./inspectorSpacing";
import { DashboardChartTitleStylePanel } from "./dashboardChartTitleStylePanel";
import { DeAttrField, DeAttrToggleRow } from "./dashboardInspectorUi";
import { ChartBackgroundDeModeFields } from "./chartStyleFields";
import { ChartDeSegmentField } from "./chartInspectorDeFields";
import { ChartPaletteConfigFields } from "./chartPaletteConfigFields";

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

export function DashboardWidgetStyleSections({
  styleConfig,
  patchStyle,
}: StyleSectionProps) {
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
      <DashboardConfigSection title="图表样式" defaultOpen>
        <div className="space-y-3">
        <DeAttrField label="背景" compact>
          <div className="space-y-2">
            <div className="flex items-center justify-end">
              <Switch
                checked={ws.backgroundShow !== false}
                onCheckedChange={(show) => patchWidgetStyle({ backgroundShow: show })}
                aria-label="背景"
                className="scale-90"
              />
            </div>
            <ChartBackgroundDeModeFields
              value={ws}
              onChange={patchWidgetStyle}
              disabled={ws.backgroundShow === false}
            />
          </div>
        </DeAttrField>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <ColorField
              compact
              allowClear
              label="背景色"
              swatches={SURFACE_COLOR_RECOMMENDED}
              value={ws.background ?? ""}
              onChange={(color) => patchWidgetStyle({ background: color })}
            />
          </div>
          <div className="col-span-2 min-w-0">
            <DashboardConfigSlider
              label="背景模糊"
              value={ws.backdropBlur}
              fallback={0}
              min={0}
              max={48}
              step={1}
              unit="px"
              onChange={(backdropBlur) => patchWidgetStyle({ backdropBlur })}
            />
          </div>
          <div className="col-span-2 space-y-2 border-t border-gray-100 pt-2 dark:border-white/[0.06]">
            <Label className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">边框</Label>
            <DeAttrToggleRow
              label="显示边框"
              checked={ws.borderEnabled !== false}
              onCheckedChange={(show) => patchWidgetStyle({ borderEnabled: show })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <ColorField
                  compact
                  allowClear
                  label="边框色"
                  swatches={WIDGET_BORDER_RECOMMENDED}
                  value={ws.borderColor ?? ""}
                  onChange={(color) => patchWidgetStyle({ borderColor: color })}
                />
              </div>
              <div className="min-w-0">
                <DashboardConfigGridSlider
                  label="线宽"
                  value={ws.borderWidth}
                  fallback={1}
                  min={0}
                  max={8}
                  step={1}
                  unit="px"
                  onChange={(borderWidth) => patchWidgetStyle({ borderWidth })}
                />
              </div>
            </div>
            <ChartDeSegmentField
              label="样式"
              value={ws.borderStyle ?? "solid"}
              columns={3}
              options={WIDGET_BORDER_STYLES.map((s) => ({ value: s.value, label: s.label }))}
              onChange={(style) =>
                patchWidgetStyle({ borderStyle: style as "solid" | "dashed" | "dotted" })
              }
            />
          </div>
          <div className="col-span-2 min-w-0">
            <DashboardConfigSlider
              label="透明度"
              value={ws.opacity != null ? Math.round(ws.opacity * 100) : undefined}
              fallback={100}
              min={0}
              max={100}
              step={1}
              unit="%"
              onChange={(opacity) => patchWidgetStyle({ opacity: opacity / 100 })}
            />
          </div>
        </div>

        <SpacingModeToggle
          label="内边距模式"
          mode={ws.paddingMode ?? "unified"}
          onChange={(paddingMode) => patchWidgetStyle({ paddingMode })}
        />
        {(ws.paddingMode ?? "unified") === "unified" ? (
          <DashboardConfigSlider
            label="内边距"
            value={ws.padding}
            fallback={8}
            min={0}
            max={64}
            step={1}
            unit="px"
            onChange={(padding) => patchWidgetStyle({ padding })}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
            {(["paddingTop", "paddingRight", "paddingBottom", "paddingLeft"] as const).map((key) => (
              <DashboardConfigGridSlider
                key={key}
                label={
                  key === "paddingTop"
                    ? "上"
                    : key === "paddingRight"
                      ? "右"
                      : key === "paddingBottom"
                        ? "下"
                        : "左"
                }
                value={ws[key]}
                fallback={8}
                min={0}
                max={64}
                step={1}
                unit="px"
                onChange={(next) => patchWidgetStyle({ [key]: next })}
              />
            ))}
          </div>
        )}

        <SpacingModeToggle
          label="圆角模式"
          mode={ws.radiusMode ?? "unified"}
          onChange={(radiusMode) => patchWidgetStyle({ radiusMode })}
        />
        {(ws.radiusMode ?? "unified") === "unified" ? (
          <DashboardConfigSlider
            label="圆角"
            value={ws.borderRadius}
            fallback={8}
            min={0}
            max={48}
            step={1}
            unit="px"
            onChange={(borderRadius) => patchWidgetStyle({ borderRadius })}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
            {(
              [
                ["borderRadiusTopLeft", "左上"],
                ["borderRadiusTopRight", "右上"],
                ["borderRadiusBottomLeft", "左下"],
                ["borderRadiusBottomRight", "右下"],
              ] as const
            ).map(([key, label]) => (
              <DashboardConfigGridSlider
                key={key}
                label={label}
                value={ws[key]}
                fallback={8}
                min={0}
                max={48}
                step={1}
                unit="px"
                onChange={(next) => patchWidgetStyle({ [key]: next })}
              />
            ))}
          </div>
        )}
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="图表配色">
        <ChartPaletteConfigFields
          paletteId={styleConfig.paletteId}
          onPaletteChange={(paletteId, colors) =>
            patchStyle({
              paletteId: paletteId ?? "default",
              paletteColors: [...colors],
            })
          }
        />
      </DashboardConfigSection>

      <DashboardConfigSection title="图表标题" data-testid="dashboard-chart-title-style">
        <DashboardChartTitleStylePanel titleStyle={ts} onPatch={patchTitleStyle} />
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
              swatches={TEXT_COLOR_RECOMMENDED}
              value={fc.titleColor ?? ""}
              onChange={(color) =>
                patchStyle({ filterChromeStyle: { ...fc, titleColor: color } })
              }
            />
          </div>
          <div className="col-span-2">
            <DashboardConfigSlider
              label="控件高度"
              value={fctrl.height}
              fallback={32}
              min={28}
              max={48}
              step={1}
              unit="px"
              onChange={(height) =>
                patchStyle({
                  filterControlStyle: {
                    ...fctrl,
                    height,
                  },
                })
              }
            />
          </div>
          <div className="col-span-2">
            <DashboardConfigSlider
              label="控件圆角"
              value={fctrl.borderRadius}
              fallback={6}
              min={0}
              max={24}
              step={1}
              unit="px"
              onChange={(borderRadius) =>
                patchStyle({
                  filterControlStyle: {
                    ...fctrl,
                    borderRadius,
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
            <div className="col-span-2">
              <DashboardConfigSlider
                label="小数位"
                value={nf.decimals}
                fallback={0}
                min={0}
                max={8}
                step={1}
                onChange={(decimals) => patchNumberFormat({ decimals })}
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
    </>
  );
}
