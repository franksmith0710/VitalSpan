import type { ScreenBorderStyleConfig } from "@/lib/screenVisualStyle";
import { normalizeScreenBorderStyle } from "@/lib/screenVisualStyle";
import { cn } from "@/lib/utils";
import { renderScreenBorderVariant } from "./screenBorderVariants";

export type ScreenBorderDisplayProps = {
  className?: string;
  styleConfig?: ScreenBorderStyleConfig;
};

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
    </div>
  );
}
