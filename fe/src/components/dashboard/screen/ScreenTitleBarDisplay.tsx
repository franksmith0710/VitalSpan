import type { ScreenTitleBarStyleConfig } from "@/lib/screenVisualStyle";
import { normalizeScreenTitleBarStyle } from "@/lib/screenVisualStyle";
import { resolveScreenTitleBarImageUrl } from "@/lib/screenTitleBarAssets";
import { cn } from "@/lib/utils";

export type ScreenTitleBarDisplayProps = {
  title?: string;
  className?: string;
  styleConfig?: ScreenTitleBarStyleConfig;
};

/** 对标 DataEase：顶栏装饰为图片素材，标题文字叠在图片上方 */
export function ScreenTitleBarDisplay({
  title = "数据大屏标题",
  className,
  styleConfig,
}: ScreenTitleBarDisplayProps) {
  const style = normalizeScreenTitleBarStyle(styleConfig);
  const accent = style.accentColor;
  const imageUrl = resolveScreenTitleBarImageUrl(style);

  if (imageUrl) {
    return (
      <div
        className={cn("pointer-events-none relative size-full min-h-0 overflow-hidden", className)}
        data-screen-title-bar
        data-screen-title-bar-mode="image"
        aria-hidden
      >
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-fill"
          draggable={false}
          decoding="async"
        />
        <div className="relative z-10 flex size-full items-center justify-center px-16">
          <span
            className="max-w-[min(52%,42rem)] truncate text-center font-semibold tracking-[0.14em]"
            style={{
              color: style.titleColor,
              fontSize: style.fontSize,
              textShadow: `0 0 12px ${accent}66, 0 1px 3px rgba(0,0,0,0.45)`,
            }}
          >
            {title}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none flex size-full min-h-0 items-center justify-center gap-4 px-6",
        className,
      )}
      data-screen-title-bar
      data-screen-title-bar-mode="simple"
      aria-hidden
    >
      {style.showSideLines ? (
        <span
          className="h-px min-w-0 max-w-[8rem] flex-1"
          style={{
            backgroundImage: `linear-gradient(to right, transparent, ${accent}b3, ${accent}33)`,
          }}
        />
      ) : (
        <span className="min-w-0 flex-1" />
      )}
      <span
        className="shrink-0 text-center font-semibold tracking-[0.12em]"
        style={{
          color: style.titleColor,
          fontSize: style.fontSize,
          textShadow: "0 1px 2px rgba(15, 23, 42, 0.35)",
        }}
      >
        {title}
      </span>
      {style.showSideLines ? (
        <span
          className="h-px min-w-0 max-w-[8rem] flex-1"
          style={{
            backgroundImage: `linear-gradient(to left, transparent, ${accent}b3, ${accent}33)`,
          }}
        />
      ) : (
        <span className="min-w-0 flex-1" />
      )}
    </div>
  );
}
