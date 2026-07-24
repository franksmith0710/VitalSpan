import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DeAttrForm,
  DeAttrToggleRow,
} from "@/components/dashboard/dashboardInspectorUi";
import { DeAttrSliderField } from "@/components/dashboard/deAttrSlider";
import {
  createScreenBorderSparkle,
  type ScreenBorderSparkleConfig,
  type ScreenBorderSparkleStyleConfig,
} from "@/lib/screenBorderSparkle";
import { ScreenColorField } from "./ScreenVisualStylePanels";

type ScreenBorderSparkleStylePanelProps = {
  value?: ScreenBorderSparkleStyleConfig;
  accentFallback: string;
  onChange: (next: ScreenBorderSparkleStyleConfig) => void;
};

function SparkleItemEditor({
  sparkle,
  index,
  accentFallback,
  onChange,
  onRemove,
  canRemove,
}: {
  sparkle: ScreenBorderSparkleConfig;
  index: number;
  accentFallback: string;
  onChange: (next: ScreenBorderSparkleConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const patch = (partial: Partial<ScreenBorderSparkleConfig>) =>
    onChange({ ...sparkle, ...partial });

  return (
    <div
      className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]"
      data-testid={`border-sparkle-item-${index}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
          流光 {index + 1}
        </span>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-gray-400 hover:text-error-600"
            onClick={onRemove}
            aria-label={`删除流光 ${index + 1}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div className="space-y-0">
        <ScreenColorField
          label="流光颜色"
          value={sparkle.color || accentFallback}
          onChange={(color) => patch({ color })}
        />
        <DeAttrSliderField
          label="移动速度"
          compact
          value={sparkle.speed ?? 4}
          min={1}
          max={20}
          step={0.5}
          unit="s"
          ariaLabel="移动速度"
          onChange={(speed) => patch({ speed })}
        />
      </div>
    </div>
  );
}

export function ScreenBorderSparkleStylePanel({
  value,
  accentFallback,
  onChange,
}: ScreenBorderSparkleStylePanelProps) {
  const style = {
    enabled: value?.enabled ?? false,
    sparkles: value?.sparkles?.length
      ? value.sparkles
      : [createScreenBorderSparkle({ color: accentFallback })],
  };

  const patch = (partial: Partial<ScreenBorderSparkleStyleConfig>) =>
    onChange({
      enabled: partial.enabled ?? style.enabled,
      sparkles: partial.sparkles ?? style.sparkles,
    });

  const updateSparkle = (index: number, next: ScreenBorderSparkleConfig) => {
    const sparkles = style.sparkles.map((item, i) => (i === index ? next : item));
    patch({ sparkles });
  };

  const removeSparkle = (index: number) => {
    patch({ sparkles: style.sparkles.filter((_, i) => i !== index) });
  };

  const addSparkle = () => {
    patch({
      sparkles: [...style.sparkles, createScreenBorderSparkle({ color: accentFallback })],
    });
  };

  return (
    <DeAttrForm>
      <DeAttrToggleRow
        label="边框流光"
        checked={style.enabled}
        onCheckedChange={(enabled) => patch({ enabled })}
      />
      {style.enabled ? (
        <>
          <p className="px-1 pb-1 text-[10px] leading-relaxed text-gray-400 dark:text-gray-500">
            光带沿线条滑动，与描边重合，呈现柔和流光。
          </p>
          <div className="space-y-2 py-2">
            {style.sparkles.map((sparkle, index) => (
              <SparkleItemEditor
                key={sparkle.id}
                sparkle={sparkle}
                index={index}
                accentFallback={accentFallback}
                onChange={(next) => updateSparkle(index, next)}
                onRemove={() => removeSparkle(index)}
                canRemove={style.sparkles.length > 1}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full gap-1.5"
            onClick={addSparkle}
            data-testid="border-sparkle-add"
          >
            <Plus className="size-3.5" />
            添加流光
          </Button>
        </>
      ) : null}
    </DeAttrForm>
  );
}
