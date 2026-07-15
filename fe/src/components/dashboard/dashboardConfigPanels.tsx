import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  DASHBOARD_FONT_OPTIONS,
  GAP_PRESET_PX,
  THEME_ACCENT_SWATCHES,
  formatMetricValue,
  type DashboardStyleConfig,
  type GapPreset,
} from "./dashboardStyleConfig";
import { DashboardCanvasBackgroundPanel } from "./dashboardCanvasBackgroundPanel";
import { ColorField } from "@/components/ui/color-field";
import { DebouncedNumberInput } from "@/components/ui/debounced-number-input";
import type { LayoutWidget } from "./layoutUtils";
import { CHART_PALETTE_PRESETS } from "@/lib/chartPalette";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_DRILL_LEVEL_COLORS,
  resolveDashboardChrome,
} from "./dashboardChromeConfig";
import type { DashboardChromeConfig, ColorScheme, SpacingMode } from "./dashboardStyleConfig";

type PatchFn = (patch: Partial<DashboardStyleConfig>) => void;

type ThemeCardProps = {
  label: string;
  selected: boolean;
  variant: "light" | "dark";
  onSelect: () => void;
};

function ThemePreviewCard({ label, selected, variant, onSelect }: ThemeCardProps) {
  const isDark = variant === "dark";
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2 rounded-lg border p-2 text-left transition-colors",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/40",
        selected
          ? "border-brand-500 bg-brand-50/50 dark:border-brand-500 dark:bg-brand-500/10"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-white/[0.02]",
      )}
      aria-pressed={selected}
    >
      <div
        className={cn(
          "overflow-hidden rounded-md border p-1.5",
          isDark ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50",
        )}
      >
        <div className={cn("mb-1 h-1.5 w-8 rounded-full", isDark ? "bg-gray-600" : "bg-gray-300")} />
        <div className="flex gap-1">
          <div className={cn("h-8 flex-1 rounded-sm", isDark ? "bg-gray-800" : "bg-white")} />
          <div className="flex flex-1 flex-col gap-0.5">
            <div className={cn("h-3.5 flex-1 rounded-sm", isDark ? "bg-brand-400/70" : "bg-brand-400/80")} />
            <div className={cn("h-3.5 flex-1 rounded-sm", isDark ? "bg-sky-400/60" : "bg-sky-400/70")} />
          </div>
        </div>
      </div>
      <span className="text-center text-theme-xs text-gray-600 dark:text-gray-400">{label}</span>
    </button>
  );
}

function ChromeToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-theme-xs text-gray-600 dark:text-gray-400">
      <span>{label}</span>
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
    </label>
  );
}

function SpacingModeToggle({
  label,
  mode,
  onChange,
}: {
  label: string;
  mode: SpacingMode;
  onChange: (mode: SpacingMode) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-theme-xs text-gray-500">{label}</Label>
      <div className="flex gap-2">
        {(
          [
            { value: "unified", label: "统一值" },
            { value: "individual", label: "分边" },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn(
              "flex-1 rounded-md border px-2 py-1.5 text-theme-xs",
              mode === item.value
                ? "border-brand-500 bg-brand-50/60 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400",
            )}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScaleModeOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex-1 rounded-md border px-2 py-1.5 text-theme-xs transition-colors",
        selected
          ? "border-brand-500 bg-brand-50/60 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
          : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400",
      )}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

type StyleSectionProps = {
  styleConfig: DashboardStyleConfig;
  patchStyle: PatchFn;
  isPixelLayout: boolean;
  onSave?: () => void | Promise<void>;
  onSwitchColorScheme?: (scheme: ColorScheme) => void;
};

export function DashboardStyleSections({
  styleConfig,
  patchStyle,
  isPixelLayout,
  onSave,
  onSwitchColorScheme,
}: StyleSectionProps) {
  const colorScheme = styleConfig.colorScheme ?? "light";
  const gapPreset = styleConfig.gapPreset ?? (styleConfig.widgetGap != null ? "custom" : "md");
  const scaleMode = styleConfig.scaleMode ?? "canvas";
  const ws = styleConfig.widgetStyle ?? {};
  const chrome = resolveDashboardChrome(styleConfig);
  const patchChrome = (patch: Partial<DashboardChromeConfig>) =>
    patchStyle({ chrome: { ...styleConfig.chrome, ...patch } });

  return (
    <>
      <DashboardConfigSection
        title="仪表板风格"
        defaultOpen
        data-testid="dashboard-theme-section"
        action={
          onSave ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-theme-xs font-normal text-brand-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10"
              aria-label="保存"
              data-testid="dashboard-style-save"
              onClick={() => void onSave()}
            >
              保存
            </Button>
          ) : (
            <span className="px-1 text-theme-xs font-normal text-gray-400">
              样式已实时预览，保存后发布生效
            </span>
          )
        }
      >
        <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
          点击切换浅色或深色，画布与组件整套配色即时生效（与顶栏深浅色无关）。
        </p>
        <div className="flex gap-2">
          <ThemePreviewCard
            label="浅色主题"
            variant="light"
            selected={colorScheme === "light"}
            onSelect={() => onSwitchColorScheme?.("light") ?? patchStyle({ colorScheme: "light" })}
          />
          <ThemePreviewCard
            label="深色主题"
            variant="dark"
            selected={colorScheme === "dark"}
            onSelect={() => onSwitchColorScheme?.("dark") ?? patchStyle({ colorScheme: "dark" })}
          />
        </div>
      </DashboardConfigSection>

      <DashboardConfigSection title="整体配置" data-testid="dashboard-overall-config">
        <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
          正在编辑
          <span className="mx-1 font-medium text-gray-700 dark:text-gray-300">
            {colorScheme === "dark" ? "深色" : "浅色"}
          </span>
          主题下的布局与行为；画布底色/强调色等随主题分别记忆，切换上方卡片即可对照。
        </p>
        <div className="space-y-4">
          <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">当前主题视觉</p>
            <ColorField
              label="主题强调色"
              value={styleConfig.themeAccent ?? ""}
              swatches={THEME_ACCENT_SWATCHES}
              onChange={(color) => patchStyle({ themeAccent: color })}
            />
            <p className="text-[10px] text-gray-400">作用于选中框、操作轨图标等看板内强调元素</p>
            <div className="space-y-1.5">
              <Label className="text-theme-xs text-gray-600 dark:text-gray-400">全局字体</Label>
              <Select
                value={styleConfig.fontFamily || "__default__"}
                onValueChange={(value) =>
                  patchStyle({ fontFamily: value === "__default__" ? undefined : value })
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="系统默认" />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARD_FONT_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.label}
                      value={opt.value ? opt.value : "__default__"}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-theme-xs text-gray-600 dark:text-gray-400">组件默认圆角 (px)</Label>
              <Input
                type="number"
                min={0}
                max={48}
                className="h-9"
                placeholder="跟随主题"
                value={ws.borderRadius ?? ""}
                onChange={(e) =>
                  patchStyle({
                    widgetStyle: {
                      ...ws,
                      borderRadius: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-theme-xs text-gray-600 dark:text-gray-400">组件间隙</Label>
            <Select
              value={gapPreset}
              onValueChange={(value) => {
                const preset = value as GapPreset;
                if (preset === "custom") {
                  patchStyle({ gapPreset: "custom", widgetGap: styleConfig.widgetGap ?? 8 });
                } else {
                  patchStyle({ gapPreset: preset, widgetGap: GAP_PRESET_PX[preset] });
                }
              }}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无</SelectItem>
                <SelectItem value="sm">小 (4px)</SelectItem>
                <SelectItem value="md">中 (8px)</SelectItem>
                <SelectItem value="lg">大 (16px)</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
            {gapPreset === "custom" ? (
              <DebouncedNumberInput
                min={0}
                max={48}
                className="h-9"
                value={styleConfig.widgetGap ?? 8}
                onCommit={(value) => patchStyle({ widgetGap: value })}
              />
            ) : null}
            <p className="text-theme-xs text-gray-400 dark:text-gray-500">栅格模式下生效</p>
          </div>

          {isPixelLayout ? (
            <div className="space-y-1.5">
              <Label className="text-theme-xs text-gray-600 dark:text-gray-400">像素间隙 (0–12)</Label>
              <DebouncedNumberInput
                min={0}
                max={12}
                className="h-9"
                value={styleConfig.pixelGutter ?? 0}
                onCommit={(value) => patchStyle({ pixelGutter: value })}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-theme-xs text-gray-600 dark:text-gray-400">缩放模式</Label>
            <div className="flex gap-2">
              <ScaleModeOption
                label="按画布比例"
                selected={scaleMode === "canvas"}
                onSelect={() => patchStyle({ scaleMode: "canvas" })}
              />
              <ScaleModeOption
                label="按组件比例"
                selected={scaleMode === "component"}
                onSelect={() => patchStyle({ scaleMode: "component" })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-theme-xs text-gray-600 dark:text-gray-400">刷新频率 (秒)</Label>
            <Input
              type="number"
              min={5}
              max={3600}
              className="h-9"
              placeholder="仅分享页整页刷新"
              value={styleConfig.refreshIntervalSec ?? ""}
              onChange={(e) =>
                patchStyle({
                  refreshIntervalSec: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <p className="text-[10px] text-gray-400">
              整页 reload；单图刷新请在图表「数据 → 刷新频率」按组件设置
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-theme-xs text-gray-600 dark:text-gray-400">结果展示数量</Label>
            <DebouncedNumberInput
              min={1}
              max={10000}
              className="h-9"
              value={styleConfig.defaultQueryLimit ?? 100}
              onCommit={(value) => patchStyle({ defaultQueryLimit: value || 100 })}
            />
            <p className="text-[10px] text-gray-400">对标 DE「图表结果」；单图可在数据 Tab 覆盖</p>
          </div>

          <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">显示与交互</p>
            <ChromeToggleRow
              label="图表加载提示"
              checked={chrome.showChartLoadingHint}
              onCheckedChange={(checked) => patchChrome({ showChartLoadingHint: checked })}
            />
            <ChromeToggleRow
              label="悬浮操作按钮（放大/导出等）"
              checked={chrome.showFloatingActions}
              onCheckedChange={(checked) => patchChrome({ showFloatingActions: checked })}
            />
            <ChromeToggleRow
              label="组件标题栏操作按钮"
              checked={chrome.showChartActionButtons}
              onCheckedChange={(checked) => patchChrome({ showChartActionButtons: checked })}
            />
            <ChromeToggleRow
              label="编辑态辅助对齐网格"
              checked={chrome.showAuxiliaryGrid}
              onCheckedChange={(checked) => patchChrome({ showAuxiliaryGrid: checked })}
            />
          </div>
          </div>
        </div>
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
          <p className="text-[10px] text-gray-400">柱/线图数据标签与 tooltip；未单独设置时继承看板数字格式</p>
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
