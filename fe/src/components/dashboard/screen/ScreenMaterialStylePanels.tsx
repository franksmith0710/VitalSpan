import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getScreenBorderCatalogItems,
  getScreenIconCatalog,
  SCREEN_SHAPE_OPTIONS,
} from "@/lib/screenMaterialCatalog";
import type {
  ScreenBorderStyleConfig,
  ScreenIconStyleConfig,
  ScreenShapeStyleConfig,
} from "@/lib/screenVisualStyle";
import {
  normalizeScreenBorderStyle,
  normalizeScreenIconStyle,
  normalizeScreenShapeStyle,
} from "@/lib/screenVisualStyle";
import type { ScreenBorderVariant } from "@/lib/screenVisualStyle";
import { DeAttrField, DeAttrForm, DeAttrToggleRow } from "@/components/dashboard/dashboardInspectorUi";
import { ScreenBorderVariantPreview } from "./screenBorderVariants";
import { ScreenIconPreview } from "./ScreenIconDisplay";
import { ScreenShapePreview } from "./ScreenShapeDisplay";

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
        <Input className="h-9" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </DeAttrField>
  );
}

function BorderVariantPicker({
  value,
  onChange,
}: {
  value: ScreenBorderVariant;
  onChange: (variant: ScreenBorderVariant) => void;
}) {
  return (
    <DeAttrField label="边框样式" compact>
      <div className="grid grid-cols-3 gap-1.5">
        {getScreenBorderCatalogItems().map((item) => {
          const variant = item.payload.preset as ScreenBorderVariant;
          const selected = value === variant;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(variant)}
              className={cn(
                "rounded-md p-1 transition-colors",
                selected
                  ? "ring-2 ring-brand-500/60 ring-offset-1 ring-offset-white dark:ring-offset-gray-900"
                  : "hover:bg-gray-50 dark:hover:bg-white/5",
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

export function ScreenBorderMaterialStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenBorderStyleConfig>) {
  const style = normalizeScreenBorderStyle(value);
  const patch = (partial: Partial<ScreenBorderStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <DeAttrForm>
      <BorderVariantPicker
        value={style.variant}
        onChange={(variant) => patch({ variant })}
      />
      <ColorField label="强调色" value={style.accentColor} onChange={(accentColor) => patch({ accentColor })} />
      <DeAttrToggleRow
        label="外发光"
        checked={style.glowEnabled}
        onCheckedChange={(glowEnabled) => patch({ glowEnabled })}
      />
      <DeAttrField label="内框透明度" compact>
        <Input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={style.innerBorderOpacity}
          onChange={(e) => patch({ innerBorderOpacity: Number(e.target.value) })}
        />
      </DeAttrField>
    </DeAttrForm>
  );
}

export function ScreenShapeStylePanel({
  value,
  onChange,
}: ScreenStylePanelProps<ScreenShapeStyleConfig>) {
  const style = normalizeScreenShapeStyle(value);
  const patch = (partial: Partial<ScreenShapeStyleConfig>) => onChange({ ...style, ...partial });

  return (
    <DeAttrForm>
      <DeAttrField label="图形类型" compact>
        <div className="grid grid-cols-3 gap-1.5">
          {SCREEN_SHAPE_OPTIONS.map((shape) => {
            const selected = style.shape === shape.id;
            return (
              <button
                key={shape.id}
                type="button"
                onClick={() => patch({ shape: shape.id })}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md p-1 transition-colors",
                  selected
                    ? "ring-2 ring-brand-500/60 ring-offset-1 ring-offset-white dark:ring-offset-gray-900"
                    : "hover:bg-gray-50 dark:hover:bg-white/5",
                )}
                aria-pressed={selected}
                data-testid={`shape-type-${shape.id}`}
              >
                <ScreenShapePreview shape={shape.id} />
                <span className="text-[10px] text-gray-500">{shape.label}</span>
              </button>
            );
          })}
        </div>
      </DeAttrField>
      <ColorField label="描边颜色" value={style.strokeColor} onChange={(strokeColor) => patch({ strokeColor })} />
      <DeAttrField label="描边宽度" compact>
        <Input
          type="number"
          min={1}
          max={12}
          className="h-9"
          value={style.strokeWidth}
          onChange={(e) => patch({ strokeWidth: Number(e.target.value) || style.strokeWidth })}
        />
      </DeAttrField>
      <DeAttrField label="填充透明度" compact>
        <Input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={style.fillOpacity}
          onChange={(e) => patch({ fillOpacity: Number(e.target.value) })}
        />
      </DeAttrField>
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
        <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto rounded-md border border-gray-100 p-1 dark:border-gray-800">
          {getScreenIconCatalog().map((entry) => {
            const selected = style.icon === entry.name;
            return (
              <button
                key={entry.name}
                type="button"
                title={entry.label}
                onClick={() => patch({ icon: entry.name })}
                className={cn(
                  "rounded p-0.5 transition-colors",
                  selected
                    ? "ring-2 ring-brand-500/60"
                    : "hover:bg-gray-50 dark:hover:bg-white/5",
                )}
                aria-label={entry.label}
                aria-pressed={selected}
                data-testid={`icon-preset-${entry.name}`}
              >
                <ScreenIconPreview icon={entry.name} />
              </button>
            );
          })}
        </div>
      </DeAttrField>
      <ColorField label="图标颜色" value={style.color} onChange={(color) => patch({ color })} />
      <DeAttrField label="图标尺寸" compact>
        <Input
          type="number"
          min={16}
          max={128}
          className="h-9"
          value={style.size}
          onChange={(e) => patch({ size: Number(e.target.value) || style.size })}
        />
      </DeAttrField>
    </DeAttrForm>
  );
}
