import { Input } from "@/components/ui/input";
import {
  DeAttrField,
  DeAttrForm,
  DeAttrToggleRow,
  DE_INPUT,
} from "@/components/dashboard/dashboardInspectorUi";
import { DeAttrSliderField } from "@/components/dashboard/deAttrSlider";
import { getScreenBorderCatalogItems } from "@/lib/screenMaterialCatalog";
import { cn } from "@/lib/utils";
import type {
  ScreenBorderStyleConfig,
  ScreenBorderVariant,
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
import { ScreenBorderVariantPreview } from "./screenBorderVariants";
import { ScreenBorderSparkleStylePanel } from "./ScreenBorderSparkleStylePanel";

function BorderVariantPicker({
  value,
  onChange,
}: {
  value: ScreenBorderVariant;
  onChange: (variant: ScreenBorderVariant) => void;
}) {
  return (
    <DeAttrField label="边框样式" compact>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]">
        {getScreenBorderCatalogItems().map((item) => {
          const variant = item.payload.preset as ScreenBorderVariant;
          const selected = value === variant;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(variant)}
              className={cn(
                "overflow-hidden rounded-md p-0.5 transition-all",
                selected
                  ? "bg-white shadow-theme-xs ring-1 ring-brand-500/30 dark:bg-gray-900"
                  : "hover:bg-white/70 dark:hover:bg-white/[0.04]",
              )}
              aria-label={item.label}
              aria-pressed={selected}
              data-testid={`border-variant-${variant}`}
            >
              <ScreenBorderVariantPreview variant={variant} />
            </button>
          );
        })}
      </div>
    </DeAttrField>
  );
}

type ScreenStylePanelProps<T> = {
  value: T;
  onChange: (next: T) => void;
};

export function ScreenColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <DeAttrField label={label} compact>
      <div className="flex items-center gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer p-1"
          aria-label={`${label}色块`}
        />
        <Input
          className={DE_INPUT}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </DeAttrField>
  );
}

export function ScreenClockStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenClockStyleConfig>) {
  const style = normalizeScreenClockStyle(value);
  const patch = (partial: Partial<ScreenClockStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <DeAttrForm>
      <DeAttrField label="字号" compact>
        <Input
          type="number"
          min={10}
          max={72}
          className={DE_INPUT}
          value={style.fontSize}
          onChange={(e) => patch({ fontSize: Number(e.target.value) || style.fontSize })}
        />
      </DeAttrField>
      <ScreenColorField label="文字颜色" value={style.color} onChange={(color) => patch({ color })} />
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
    </DeAttrForm>
  );
}

export function ScreenDateTimeStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenDateTimeStyleConfig>) {
  const style = normalizeScreenDateTimeStyle(value);
  const patch = (partial: Partial<ScreenDateTimeStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <DeAttrForm>
      <DeAttrField label="日期字号" compact>
        <Input
          type="number"
          min={10}
          max={48}
          className={DE_INPUT}
          value={style.dateFontSize}
          onChange={(e) => patch({ dateFontSize: Number(e.target.value) || style.dateFontSize })}
        />
      </DeAttrField>
      <DeAttrField label="时间字号" compact>
        <Input
          type="number"
          min={12}
          max={72}
          className={DE_INPUT}
          value={style.timeFontSize}
          onChange={(e) => patch({ timeFontSize: Number(e.target.value) || style.timeFontSize })}
        />
      </DeAttrField>
      <ScreenColorField label="文字颜色" value={style.color} onChange={(color) => patch({ color })} />
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
    </DeAttrForm>
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
    <DeAttrForm>
      <BorderVariantPicker value={style.variant} onChange={(variant) => patch({ variant })} />
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
    </DeAttrForm>
  );
}

export function ScreenTitleBarStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenTitleBarStyleConfig>) {
  const style = normalizeScreenTitleBarStyle(value);
  const patch = (partial: Partial<ScreenTitleBarStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <DeAttrForm>
      <ScreenColorField label="标题颜色" value={style.titleColor} onChange={(titleColor) => patch({ titleColor })} />
      <ScreenColorField label="装饰线颜色" value={style.accentColor} onChange={(accentColor) => patch({ accentColor })} />
      <DeAttrToggleRow
        label="显示两侧装饰线"
        checked={style.showSideLines}
        onCheckedChange={(showSideLines) => patch({ showSideLines })}
      />
    </DeAttrForm>
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
