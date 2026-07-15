import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { DeAttrField, DeAttrForm, DE_INPUT } from "./dashboardInspectorUi";
import { ColorField } from "@/components/ui/color-field";
import {
  CANVAS_BG_RECOMMENDED,
  CANVAS_TILE_DECOR_PRESETS,
  decorPresetThumbStyle,
  patchDecorPresetStyle,
  resolveCanvasDecorPresetId,
  resolveCanvasDecorPresetIdForPanel,
  type DashboardStyleConfig,
} from "./dashboardStyleConfig";

type PatchFn = (patch: Partial<DashboardStyleConfig>) => void;

function isValidBackgroundImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^https?:\/\/.+/i.test(trimmed) || trimmed.startsWith("data:image/");
}

const URL_COMMIT_MS = 300;

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
    previewUrl.length > 0 && !isValidBackgroundImageUrl(previewUrl);
  const urlCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const scheduleImageUrlCommit = (next: string) => {
    if (urlCommitTimerRef.current) clearTimeout(urlCommitTimerRef.current);
    urlCommitTimerRef.current = setTimeout(() => commitImageUrl(next), URL_COMMIT_MS);
  };

  useEffect(
    () => () => {
      if (urlCommitTimerRef.current) clearTimeout(urlCommitTimerRef.current);
    },
    [],
  );

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
              <Input
                className={DE_INPUT}
                value={localImageUrl}
                placeholder="https://example.com/background.jpg"
                onChange={(e) => {
                  const next = e.target.value;
                  setLocalImageUrl(next);
                  scheduleImageUrlCommit(next);
                }}
                onBlur={() => {
                  if (urlCommitTimerRef.current) {
                    clearTimeout(urlCommitTimerRef.current);
                    urlCommitTimerRef.current = null;
                  }
                  commitImageUrl(localImageUrl);
                }}
              />
              {imageInvalid ? (
                <p className="text-theme-xs text-error-600 dark:text-error-400" role="alert">
                  请输入有效的图片链接（需以 https:// 或 http:// 开头）
                </p>
              ) : null}
              {isValidBackgroundImageUrl(previewUrl) ? (
                <div
                  className="h-16 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                  style={{
                    backgroundImage: `url(${previewUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                  role="img"
                  aria-label="背景图预览"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </DeAttrField>

      <DeAttrField label="弹框背景">
        <ColorField
          compact
          value={styleConfig.dialogStyle?.background ?? ""}
          onChange={(color) =>
            patchStyle({ dialogStyle: { ...styleConfig.dialogStyle, background: color } })
          }
        />
      </DeAttrField>
      <DeAttrField label="弹框字体">
        <ColorField
          compact
          value={styleConfig.dialogStyle?.fontColor ?? ""}
          onChange={(color) =>
            patchStyle({ dialogStyle: { ...styleConfig.dialogStyle, fontColor: color } })
          }
        />
      </DeAttrField>
    </DeAttrForm>
  );
}
