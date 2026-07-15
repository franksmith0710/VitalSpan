import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DeAttrField, DeAttrForm } from "./dashboardInspectorUi";
import { ColorField } from "@/components/ui/color-field";
import { ImageSourceField } from "./imageSourceField";
import { isImageSourceValue } from "./imageSourceUtils";
import {
  CANVAS_BG_RECOMMENDED,
  SURFACE_COLOR_RECOMMENDED,
  TEXT_COLOR_RECOMMENDED,
  CANVAS_TILE_DECOR_PRESETS,
  decorPresetThumbStyle,
  patchDecorPresetStyle,
  resolveCanvasDecorPresetId,
  resolveCanvasDecorPresetIdForPanel,
  type DashboardStyleConfig,
} from "./dashboardStyleConfig";

type PatchFn = (patch: Partial<DashboardStyleConfig>) => void;

type DashboardCanvasBackgroundPanelProps = {
  styleConfig: DashboardStyleConfig;
  patchStyle: PatchFn;
};

export function DashboardCanvasBackgroundPanel({
  styleConfig,
  patchStyle,
}: DashboardCanvasBackgroundPanelProps) {
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(
    () =>
      Boolean(styleConfig.canvasBackgroundImage?.trim()) &&
      resolveCanvasDecorPresetId(styleConfig) === "custom",
  );
  const decorId = resolveCanvasDecorPresetIdForPanel(styleConfig);
  const colorScheme = styleConfig.colorScheme ?? "light";
  const underlay =
    styleConfig.canvasBackgroundCustom && styleConfig.canvasBackground?.trim()
      ? styleConfig.canvasBackground.trim()
      : undefined;
  const imageUrl = styleConfig.canvasBackgroundImage ?? "";
  const [localImageUrl, setLocalImageUrl] = useState(imageUrl);
  const previewUrl = localImageUrl.trim();
  const imageInvalid =
    previewUrl.length > 0 && !isImageSourceValue(previewUrl);

  useEffect(() => {
    setLocalImageUrl(imageUrl);
  }, [imageUrl]);

  const commitImageUrl = (next: string) => {
    const trimmed = next.trim();
    patchStyle({
      canvasBackgroundImage: trimmed || undefined,
      canvasBackgroundCustom: Boolean(trimmed),
      canvasDecorPresetId: trimmed ? "custom" : undefined,
    });
  };

  return (
    <DeAttrForm>
      <DeAttrField label="画布底色">
        <ColorField
          compact
          value={styleConfig.canvasBackground ?? ""}
          swatches={CANVAS_BG_RECOMMENDED}
          onChange={(color) =>
            patchStyle({
              canvasBackground: color,
              canvasBackgroundCustom: Boolean(color),
              ...(color
                ? {}
                : {
                    canvasBackgroundImage: undefined,
                    canvasDecorPresetId: undefined,
                  }),
            })
          }
        />
      </DeAttrField>

      <DeAttrField label="背景装饰" hint="仅叠加纹理，不改底色">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="背景装饰">
          {CANVAS_TILE_DECOR_PRESETS.map((preset) => {
            const selected = decorId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 transition-all",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30",
                  selected
                    ? "border-brand-500 bg-brand-50/60 shadow-theme-xs dark:border-brand-500 dark:bg-brand-500/10"
                    : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-transparent dark:hover:border-gray-600",
                )}
                aria-pressed={selected}
                onClick={() => {
                  patchStyle(patchDecorPresetStyle(preset.id, styleConfig));
                  setShowAdvancedUrl(false);
                }}
              >
                <span
                  className="size-5 shrink-0 rounded-[4px] border border-gray-200/80 dark:border-gray-600"
                  style={decorPresetThumbStyle(preset.id, colorScheme, underlay)}
                  aria-hidden
                />
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </DeAttrField>

      <DeAttrField label="自定义背景图">
        <div className="space-y-2">
          <button
            type="button"
            className="text-theme-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            onClick={() => setShowAdvancedUrl((open) => !open)}
          >
            {showAdvancedUrl ? "收起自定义图片" : "使用自定义背景图…"}
          </button>
          {showAdvancedUrl ? (
            <div className="space-y-2">
              <ImageSourceField
                showPreview
                value={localImageUrl}
                onChange={(next) => {
                  const value = next ?? "";
                  setLocalImageUrl(value);
                  commitImageUrl(value);
                }}
              />
              {imageInvalid ? (
                <p className="text-theme-xs text-error-600 dark:text-error-400" role="alert">
                  请输入有效的图片链接，或选择本地图片文件
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </DeAttrField>

      <DeAttrField label="弹框背景">
        <ColorField
          compact
          swatches={SURFACE_COLOR_RECOMMENDED}
          value={styleConfig.dialogStyle?.background ?? ""}
          onChange={(color) =>
            patchStyle({ dialogStyle: { ...styleConfig.dialogStyle, background: color } })
          }
        />
      </DeAttrField>
      <DeAttrField label="弹框字体">
        <ColorField
          compact
          swatches={TEXT_COLOR_RECOMMENDED}
          value={styleConfig.dialogStyle?.fontColor ?? ""}
          onChange={(color) =>
            patchStyle({ dialogStyle: { ...styleConfig.dialogStyle, fontColor: color } })
          }
        />
      </DeAttrField>
    </DeAttrForm>
  );
}
