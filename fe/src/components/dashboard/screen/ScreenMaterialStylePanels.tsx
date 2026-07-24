import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getScreenIconCatalog, SCREEN_SHAPE_OPTIONS } from "@/lib/screenMaterialCatalog";
import type { ScreenIconStyleConfig, ScreenShapeKind, ScreenShapeStyleConfig } from "@/lib/screenVisualStyle";
import { normalizeScreenIconStyle, normalizeScreenShapeStyle } from "@/lib/screenVisualStyle";
import {
  DeAttrField,
  DeAttrForm,
  DeSegmentGroup,
  DE_INPUT,
} from "@/components/dashboard/dashboardInspectorUi";
import { DeAttrSliderField } from "@/components/dashboard/deAttrSlider";
import { resolveScreenIcon } from "./ScreenIconDisplay";
import { ScreenColorField } from "./ScreenVisualStylePanels";

type ScreenStylePanelProps<T> = {
  value: T;
  onChange: (next: T) => void;
};

export function ScreenShapeStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenShapeStyleConfig>) {
  const style = normalizeScreenShapeStyle(value);
  const patch = (partial: Partial<ScreenShapeStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <DeAttrForm>
      <DeAttrField label="图形类型" compact>
        <DeSegmentGroup
          value={style.shape}
          options={SCREEN_SHAPE_OPTIONS.map((shape) => ({
            value: shape.id,
            label: shape.label,
          }))}
          columns={3}
          onChange={(next) => patch({ shape: next as ScreenShapeKind })}
        />
      </DeAttrField>
      <ScreenColorField label="描边颜色" value={style.strokeColor} onChange={(strokeColor) => patch({ strokeColor })} />
      <DeAttrField label="描边宽度" compact>
        <Input
          type="number"
          min={1}
          max={12}
          className={DE_INPUT}
          value={style.strokeWidth}
          onChange={(e) => patch({ strokeWidth: Number(e.target.value) || style.strokeWidth })}
        />
      </DeAttrField>
      <DeAttrSliderField
        label="填充透明度"
        compact
        value={style.fillOpacity}
        min={0}
        max={1}
        step={0.05}
        ariaLabel="填充透明度"
        onChange={(fillOpacity) => patch({ fillOpacity })}
      />
    </DeAttrForm>
  );
}

export function ScreenIconStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenIconStyleConfig>) {
  const style = normalizeScreenIconStyle(value);
  const patch = (partial: Partial<ScreenIconStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <DeAttrForm>
      <DeAttrField label="图标" compact>
        <div className="grid max-h-44 grid-cols-6 gap-0.5 overflow-y-auto rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]">
          {getScreenIconCatalog().map((entry) => {
            const selected = style.icon === entry.name;
            const Icon = resolveScreenIcon(entry.name);
            return (
              <button
                key={entry.name}
                type="button"
                title={entry.label}
                onClick={() => patch({ icon: entry.name })}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md transition-all",
                  selected
                    ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-900 dark:text-brand-300"
                    : "text-gray-600 hover:bg-white/70 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-200",
                )}
                aria-label={entry.label}
                aria-pressed={selected}
                data-testid={`icon-preset-${entry.name}`}
              >
                <Icon className="size-4" strokeWidth={1.5} aria-hidden />
              </button>
            );
          })}
        </div>
      </DeAttrField>
      <ScreenColorField label="图标颜色" value={style.color} onChange={(color) => patch({ color })} />
      <DeAttrField label="图标尺寸" compact>
        <Input
          type="number"
          min={16}
          max={128}
          className={DE_INPUT}
          value={style.size}
          onChange={(e) => patch({ size: Number(e.target.value) || style.size })}
        />
      </DeAttrField>
    </DeAttrForm>
  );
}
