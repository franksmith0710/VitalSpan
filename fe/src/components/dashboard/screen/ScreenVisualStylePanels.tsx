import { Input } from "@/components/ui/input";
import {
  DeAttrField,
  DeAttrToggleRow,
  DE_INPUT,
} from "@/components/dashboard/dashboardInspectorUi";
import { DeAttrSliderField } from "@/components/dashboard/deAttrSlider";
import {
  TEXT_COLOR_RECOMMENDED,
  WIDGET_BORDER_RECOMMENDED,
} from "@/components/dashboard/dashboardStyleConfig";
import { ChartInspectorSection, InspectorInlineColorRow } from "@/components/dashboard/inspectorCompact";
import type {
  ScreenBorderStyleConfig,
  ScreenClockStyleConfig,
  ScreenDateTimeStyleConfig,
  ScreenTitleBarStyleConfig,
  ScreenVisualStyleConfig,
} from "@/lib/screenVisualStyle";
import {
  normalizeScreenBorderStyle,
  normalizeScreenClockStyle,
  normalizeScreenDateTimeStyle,
  normalizeScreenTitleBarStyle,
} from "@/lib/screenVisualStyle";
import { ScreenBorderSparkleStylePanel } from "./ScreenBorderSparkleStylePanel";
import { ScreenBorderVariantPicker } from "./ScreenBorderVariantPicker";

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
      <DeAttrField label="字号" compact className="border-b-0 py-0">
        <Input
          type="number"
          min={10}
          max={72}
          className={DE_INPUT}
          value={style.fontSize}
          onChange={(e) => patch({ fontSize: Number(e.target.value) || style.fontSize })}
        />
      </DeAttrField>
      <ScreenColorField label="文字颜色" kind="text" value={style.color} onChange={(color) => patch({ color })} />
      <DeAttrToggleRow
        label="显示星期"
        checked={style.showWeekday}
        onCheckedChange={(showWeekday) => patch({ showWeekday })}
      />
      <DeAttrToggleRow
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
      <DeAttrField label="日期字号" compact className="border-b-0 py-0">
        <Input
          type="number"
          min={10}
          max={48}
          className={DE_INPUT}
          value={style.dateFontSize}
          onChange={(e) => patch({ dateFontSize: Number(e.target.value) || style.dateFontSize })}
        />
      </DeAttrField>
      <DeAttrField label="时间字号" compact className="border-b-0 py-0">
        <Input
          type="number"
          min={12}
          max={72}
          className={DE_INPUT}
          value={style.timeFontSize}
          onChange={(e) => patch({ timeFontSize: Number(e.target.value) || style.timeFontSize })}
        />
      </DeAttrField>
      <ScreenColorField label="文字颜色" kind="text" value={style.color} onChange={(color) => patch({ color })} />
      <DeAttrToggleRow
        label="显示星期"
        checked={style.showWeekday}
        onCheckedChange={(showWeekday) => patch({ showWeekday })}
      />
      <DeAttrToggleRow
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
      <DeAttrToggleRow
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

  return (
    <ChartInspectorSection title="标题装饰" defaultOpen data-testid="screen-titlebar-style-panel">
      <ScreenColorField label="标题颜色" kind="text" value={style.titleColor} onChange={(titleColor) => patch({ titleColor })} />
      <ScreenColorField label="装饰线颜色" value={style.accentColor} onChange={(accentColor) => patch({ accentColor })} />
      <DeAttrToggleRow
        label="显示两侧装饰线"
        checked={style.showSideLines}
        onCheckedChange={(showSideLines) => patch({ showSideLines })}
      />
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
