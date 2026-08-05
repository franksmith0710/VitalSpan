import {
  DeAttrField,
} from "@/components/dashboard/dashboardInspectorUi";
import { DeAttrSliderField } from "@/components/dashboard/deAttrSlider";
import { ChartPaletteFontSizeSelect } from "@/components/dashboard/chartPaletteShared";
import {
  TEXT_COLOR_RECOMMENDED,
  WIDGET_BORDER_RECOMMENDED,
} from "@/components/dashboard/dashboardStyleConfig";
import { CHART_FONT_SIZE_OPTIONS } from "@/lib/chartFontSizes";
import {
  ChartInspectorSection,
  InspectorInlineColorRow,
  InspectorSwitchRow,
} from "@/components/dashboard/inspectorCompact";
import type {
  ScreenBorderStyleConfig,
  ScreenClockStyleConfig,
  ScreenDateTimeStyleConfig,
  ScreenTitleBarStyleConfig,
  ScreenVisualStyleConfig,
} from "@/lib/screenVisualStyle";
import {
  DEFAULT_SCREEN_CLOCK_STYLE,
  DEFAULT_SCREEN_DATETIME_STYLE,
  normalizeScreenBorderStyle,
  normalizeScreenClockStyle,
  normalizeScreenDateTimeStyle,
  normalizeScreenTitleBarStyle,
} from "@/lib/screenVisualStyle";
import { cn } from "@/lib/utils";
import {
  SCREEN_TITLE_BAR_PALETTES,
  SCREEN_TITLE_BAR_VARIANTS,
  buildScreenTitleBarImagePath,
  resolveScreenTitleBarImageUrl,
} from "@/lib/screenTitleBarAssets";
import { ScreenBorderSparkleStylePanel } from "./ScreenBorderSparkleStylePanel";
import { ScreenBorderVariantPicker } from "./ScreenBorderVariantPicker";

/** 时钟/时间行：在图表标准档位上扩展大屏标题级字号 */
const SCREEN_LARGE_FONT_SIZE_OPTIONS = [...CHART_FONT_SIZE_OPTIONS, 56, 64, 72] as const;

type ScreenStylePanelProps<T> = {
  value: T;
  onChange: (next: T) => void;
};

export function ScreenColorField({
  label,
  value,
  onChange,
  kind = "accent",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  kind?: "accent" | "text";
}) {
  return (
    <InspectorInlineColorRow
      label={label}
      value={value}
      allowClear={false}
      swatches={kind === "text" ? TEXT_COLOR_RECOMMENDED : WIDGET_BORDER_RECOMMENDED}
      onChange={(next) => onChange(next ?? value)}
    />
  );
}

export function ScreenClockStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenClockStyleConfig>) {
  const style = normalizeScreenClockStyle(value);
  const patch = (partial: Partial<ScreenClockStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <ChartInspectorSection title="时钟" defaultOpen data-testid="screen-clock-style-panel">
      <ChartPaletteFontSizeSelect
        label="字号"
        density="narrow"
        value={style.fontSize}
        fallback={DEFAULT_SCREEN_CLOCK_STYLE.fontSize}
        options={SCREEN_LARGE_FONT_SIZE_OPTIONS}
        onChange={(fontSize) => patch({ fontSize })}
      />
      <ScreenColorField label="文字颜色" kind="text" value={style.color} onChange={(color) => patch({ color })} />
      <InspectorSwitchRow
        label="显示星期"
        checked={style.showWeekday}
        onCheckedChange={(showWeekday) => patch({ showWeekday })}
      />
      <InspectorSwitchRow
        label="显示秒"
        checked={style.showSeconds}
        onCheckedChange={(showSeconds) => patch({ showSeconds })}
      />
    </ChartInspectorSection>
  );
}

export function ScreenDateTimeStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenDateTimeStyleConfig>) {
  const style = normalizeScreenDateTimeStyle(value);
  const patch = (partial: Partial<ScreenDateTimeStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <ChartInspectorSection title="日期时间" defaultOpen data-testid="screen-datetime-style-panel">
      <ChartPaletteFontSizeSelect
        label="日期字号"
        density="narrow"
        value={style.dateFontSize}
        fallback={DEFAULT_SCREEN_DATETIME_STYLE.dateFontSize}
        options={CHART_FONT_SIZE_OPTIONS}
        onChange={(dateFontSize) => patch({ dateFontSize })}
      />
      <ChartPaletteFontSizeSelect
        label="时间字号"
        density="narrow"
        value={style.timeFontSize}
        fallback={DEFAULT_SCREEN_DATETIME_STYLE.timeFontSize}
        options={SCREEN_LARGE_FONT_SIZE_OPTIONS}
        onChange={(timeFontSize) => patch({ timeFontSize })}
      />
      <ScreenColorField label="文字颜色" kind="text" value={style.color} onChange={(color) => patch({ color })} />
      <InspectorSwitchRow
        label="显示星期"
        checked={style.showWeekday}
        onCheckedChange={(showWeekday) => patch({ showWeekday })}
      />
      <InspectorSwitchRow
        label="显示秒"
        checked={style.showSeconds}
        onCheckedChange={(showSeconds) => patch({ showSeconds })}
      />
    </ChartInspectorSection>
  );
}

export function ScreenBorderStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenBorderStyleConfig>) {
  const style = normalizeScreenBorderStyle(value);
  const patch = (partial: Partial<ScreenBorderStyleConfig>) =>
    onChange({ ...(value ?? {}), ...partial });

  return (
    <ChartInspectorSection title="边框" defaultOpen data-testid="screen-border-style-panel">
      <DeAttrField label="边框样式" compact className="border-b-0 py-0">
        <ScreenBorderVariantPicker style={style} onChange={(variant) => patch({ variant })} />
      </DeAttrField>
      <ScreenColorField label="强调色" value={style.accentColor} onChange={(accentColor) => patch({ accentColor })} />
      <InspectorSwitchRow
        label="外发光"
        checked={style.glowEnabled}
        onCheckedChange={(glowEnabled) => patch({ glowEnabled })}
      />
      <DeAttrSliderField
        label="内框透明度"
        compact
        value={style.innerBorderOpacity}
        min={0}
        max={1}
        step={0.05}
        ariaLabel="内框透明度"
        onChange={(innerBorderOpacity) => patch({ innerBorderOpacity })}
      />
      <ScreenBorderSparkleStylePanel
        value={value?.sparkle}
        accentFallback={style.accentColor}
        onChange={(sparkle) => patch({ sparkle })}
      />
    </ChartInspectorSection>
  );
}

export function ScreenTitleBarStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenTitleBarStyleConfig>) {
  const style = normalizeScreenTitleBarStyle(value);
  const patch = (partial: Partial<ScreenTitleBarStyleConfig>) => onChange({ ...style, ...partial });
  const isSimple = style.variant === "simple";
  const previewUrl = resolveScreenTitleBarImageUrl(style);
  const activePalette = style.palette || "cyan";

  return (
    <ChartInspectorSection title="标题装饰" defaultOpen data-testid="screen-titlebar-style-panel">
      <div className="grid grid-cols-2 gap-2">
        {SCREEN_TITLE_BAR_VARIANTS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`titlebar-variant-${item.id}`}
            className={cn(
              "rounded-md border px-2 py-1.5 text-xs transition-colors",
              style.variant === item.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
            onClick={() => patch({ variant: item.id, backgroundImage: "" })}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          data-testid="titlebar-variant-simple"
          className={cn(
            "col-span-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
            isSimple
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:border-primary/40",
          )}
          onClick={() => patch({ variant: "simple", backgroundImage: "" })}
        >
          简约渐变线（无图片）
        </button>
      </div>
      {!isSimple ? (
        <>
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">装饰图片色系</p>
          <div className="grid grid-cols-5 gap-1.5">
            {SCREEN_TITLE_BAR_PALETTES.map((palette) => {
              const thumb = buildScreenTitleBarImagePath(style.variant, palette);
              return (
                <button
                  key={palette}
                  type="button"
                  data-testid={`titlebar-palette-${palette}`}
                  title={palette}
                  className={cn(
                    "overflow-hidden rounded border bg-[#0b0f14] transition-colors",
                    activePalette === palette
                      ? "border-primary ring-1 ring-primary/40"
                      : "border-border hover:border-primary/30",
                  )}
                  onClick={() => patch({ palette, backgroundImage: "" })}
                >
                  <img src={thumb} alt="" className="h-7 w-full object-cover object-center" />
                </button>
              );
            })}
          </div>
          {previewUrl ? (
            <div className="overflow-hidden rounded-lg border border-border bg-[#0b0f14]">
              <img src={previewUrl} alt="" className="h-12 w-full object-cover object-center" />
            </div>
          ) : null}
        </>
      ) : null}
      <ScreenColorField label="标题颜色" kind="text" value={style.titleColor} onChange={(titleColor) => patch({ titleColor })} />
      <ScreenColorField label="装饰线颜色" value={style.accentColor} onChange={(accentColor) => patch({ accentColor })} />
      {isSimple ? (
        <InspectorSwitchRow
          label="显示两侧装饰线"
          checked={style.showSideLines}
          onCheckedChange={(showSideLines) => patch({ showSideLines })}
        />
      ) : null}
    </ChartInspectorSection>
  );
}

export function patchScreenVisualStyle(
  current: ScreenVisualStyleConfig | undefined,
  key: keyof ScreenVisualStyleConfig,
  partial: ScreenVisualStyleConfig[typeof key],
): ScreenVisualStyleConfig {
  return {
    ...current,
    [key]: {
      ...(current?.[key] ?? {}),
      ...(partial ?? {}),
    },
  };
}
