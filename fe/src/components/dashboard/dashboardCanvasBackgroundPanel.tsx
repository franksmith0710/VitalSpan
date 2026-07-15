import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorField } from "@/components/ui/color-field";
import {
  CANVAS_BG_DECOR_PRESETS,
  CANVAS_BG_RECOMMENDED,
  decorPresetPreviewStyle,
  patchDecorPresetStyle,
  resolveCanvasDecorPresetId,
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
  const decorId = resolveCanvasDecorPresetId(styleConfig);
  const colorScheme = styleConfig.colorScheme ?? "light";
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
    <div className="space-y-4">
      <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
        设置画布底色与装饰纹理；随当前深浅主题分别保存（在「仪表板风格」切换主题可对照）。
      </p>

      <ColorField
        label="画布底色"
        value={styleConfig.canvasBackground ?? ""}
        swatches={CANVAS_BG_RECOMMENDED}
        onChange={(color) =>
          patchStyle({ canvasBackground: color, canvasBackgroundCustom: true })
        }
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
                  patchStyle(patchDecorPresetStyle(preset.id, styleConfig));
                  setShowAdvancedUrl(false);
                }}
              >
                <span
                  className="size-8 shrink-0 rounded-md border border-gray-200/80 dark:border-gray-700"
                  style={decorPresetPreviewStyle(preset.id, colorScheme)}
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

      <div className="space-y-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">弹框样式</p>
        <ColorField
          label="弹框背景色"
          value={styleConfig.dialogStyle?.background ?? ""}
          onChange={(color) =>
            patchStyle({ dialogStyle: { ...styleConfig.dialogStyle, background: color } })
          }
        />
        <ColorField
          label="弹框字体色"
          value={styleConfig.dialogStyle?.fontColor ?? ""}
          onChange={(color) =>
            patchStyle({ dialogStyle: { ...styleConfig.dialogStyle, fontColor: color } })
          }
        />
      </div>
    </div>
  );
}
