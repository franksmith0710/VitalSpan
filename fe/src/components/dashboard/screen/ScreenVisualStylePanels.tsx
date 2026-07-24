import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DeAttrField,
  DeAttrForm,
  DeAttrToggleRow,
  DE_INPUT,
} from "@/components/dashboard/dashboardInspectorUi";
import { INSPECTOR_SWITCH_SIZE } from "@/components/dashboard/inspectorCompact";
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

type ScreenStylePanelProps<T> = {
  value: T;
  onChange: (next: T) => void;
};

function ColorField({
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
      <ColorField label="文字颜色" value={style.color} onChange={(color) => patch({ color })} />
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
      <ColorField label="文字颜色" value={style.color} onChange={(color) => patch({ color })} />
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
  const patch = (partial: Partial<ScreenBorderStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <DeAttrForm>
      <ColorField label="强调色" value={style.accentColor} onChange={(accentColor) => patch({ accentColor })} />
      <DeAttrToggleRow
        label="外发光"
        checked={style.glowEnabled}
        onCheckedChange={(glowEnabled) => patch({ glowEnabled })}
      />
      <DeAttrField label="内框透明度" compact>
        <div className="flex items-center gap-2">
          <Input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={style.innerBorderOpacity}
            onChange={(e) => patch({ innerBorderOpacity: Number(e.target.value) })}
            className="flex-1"
          />
          <Switch
            checked={style.innerBorderOpacity > 0}
            onCheckedChange={(on) => patch({ innerBorderOpacity: on ? 0.3 : 0 })}
            size={INSPECTOR_SWITCH_SIZE}
            aria-label="内框可见"
          />
        </div>
      </DeAttrField>
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
      <ColorField label="标题颜色" value={style.titleColor} onChange={(titleColor) => patch({ titleColor })} />
      <ColorField label="装饰线颜色" value={style.accentColor} onChange={(accentColor) => patch({ accentColor })} />
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
