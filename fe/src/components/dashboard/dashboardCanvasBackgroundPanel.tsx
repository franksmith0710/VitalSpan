import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorField } from "@/components/ui/color-field";
import {
  CANVAS_BG_DECOR_PRESETS,
  CANVAS_BG_RECOMMENDED,
  resolveCanvasDecorPresetId,
  type DashboardStyleConfig,
} from "./dashboardStyleConfig";

type PatchFn = (patch: Partial<DashboardStyleConfig>) => void;

function isValidBackgroundImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^https?:\/\/.+/i.test(trimmed) || trimmed.startsWith("data:image/");
}

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
  const decorId = resolveCanvasDecorPresetId(styleConfig);
  const imageUrl = styleConfig.canvasBackgroundImage ?? "";
  const imageInvalid = imageUrl.trim().length > 0 && !isValidBackgroundImageUrl(imageUrl);

  return (
    <div className="space-y-4">
      <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
        设置画布底色与装饰纹理，与上方「仪表板风格」深浅色主题互不影响。
      </p>

      <ColorField
        label="画布底色"
        value={styleConfig.canvasBackground ?? ""}
        swatches={CANVAS_BG_RECOMMENDED}
        onChange={(color) => patchStyle({ canvasBackground: color })}
      />

      <div className="space-y-2">
        <Label className="text-theme-xs text-gray-600 dark:text-gray-400">背景装饰</Label>
        <div className="grid grid-cols-2 gap-2">
          {CANVAS_BG_DECOR_PRESETS.map((preset) => {
            const selected = decorId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2 text-left transition-colors",
                  selected
                    ? "border-brand-500 bg-brand-50/50 dark:bg-brand-500/10"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700",
                )}
                aria-pressed={selected}
                onClick={() => {
                  if (preset.id === "none") {
                    patchStyle({ canvasBackgroundImage: undefined });
                    setShowAdvancedUrl(false);
                    return;
                  }
                  if (preset.id === "gradient-soft") {
                    patchStyle({
                      canvasBackgroundImage: undefined,
                      canvasBackground: preset.canvasBackground,
                    });
                    setShowAdvancedUrl(false);
                    return;
                  }
                  patchStyle({
                    canvasBackgroundImage: preset.image,
                    canvasBackground: styleConfig.canvasBackground,
                  });
                  setShowAdvancedUrl(false);
                }}
              >
                <span
                  className="size-8 shrink-0 rounded-md border border-gray-200/80 dark:border-gray-700"
                  style={preset.previewStyle}
                  aria-hidden
                />
                <span className="text-theme-xs text-gray-700 dark:text-gray-300">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-dashed border-gray-200 p-3 dark:border-gray-700">
        <button
          type="button"
          className="text-theme-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          onClick={() => setShowAdvancedUrl((open) => !open)}
        >
          {showAdvancedUrl ? "收起自定义图片" : "使用自定义背景图…"}
        </button>
        {showAdvancedUrl ? (
          <div className="space-y-2">
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              粘贴以 http(s) 开头的图片地址；上传文件需先放到对象存储或静态资源目录。
            </p>
            <Input
              className="h-9"
              value={imageUrl}
              placeholder="https://example.com/background.jpg"
              onChange={(e) => {
                const next = e.target.value.trim();
                patchStyle({ canvasBackgroundImage: next || undefined });
              }}
            />
            {imageInvalid ? (
              <p className="text-theme-xs text-error-600 dark:text-error-400" role="alert">
                请输入有效的图片链接（需以 https:// 或 http:// 开头）
              </p>
            ) : null}
            {isValidBackgroundImageUrl(imageUrl) ? (
              <div
                className="h-16 overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                style={{
                  backgroundImage: `url(${imageUrl})`,
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
    </div>
  );
}
