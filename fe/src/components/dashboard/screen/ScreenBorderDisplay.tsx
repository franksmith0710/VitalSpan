import type { ScreenBorderStyleConfig } from "@/lib/screenVisualStyle";
import { normalizeScreenBorderStyle } from "@/lib/screenVisualStyle";
import { cn } from "@/lib/utils";
import { renderScreenBorderVariant } from "./screenBorderVariants";
import { ScreenBorderSparkles } from "./ScreenBorderSparkles";

export type ScreenBorderDisplayProps = {
  className?: string;
  styleConfig?: ScreenBorderStyleConfig;
};

/** 配置栏缩略图：与画布 ScreenBorderDisplay 同一路径渲染 */
export function ScreenBorderStyleThumbnail({
  styleConfig,
  className,
}: {
  styleConfig?: ScreenBorderStyleConfig;
  className?: string;
}) {
  return (
    <div className={cn("relative size-full min-h-0 overflow-hidden", className)}>
      <ScreenBorderDisplay className="absolute inset-0" styleConfig={styleConfig} />
    </div>
  );
}

/** 对标 DataEase 素材边框 + screen-panel 角标发光 */
export function ScreenBorderDisplay({ className, styleConfig }: ScreenBorderDisplayProps) {
  const style = normalizeScreenBorderStyle(styleConfig);
  const accent = style.accentColor;
  const glow = style.glowEnabled ? `0 0 12px ${accent}26` : undefined;

  return (
    <div
      className={cn("pointer-events-none relative size-full min-h-0", className)}
      data-screen-border
      aria-hidden
    >
      {renderScreenBorderVariant(style.variant, {
        accent,
        innerOpacity: style.innerBorderOpacity,
        glow,
      })}
      {style.sparkle.enabled ? (
        <ScreenBorderSparkles sparkles={style.sparkle.sparkles} variant={style.variant} />
      ) : null}
    </div>
  );
}
