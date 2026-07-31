import type { ScreenTitleBarStyleConfig } from "@/lib/screenVisualStyle";
import { normalizeScreenTitleBarStyle } from "@/lib/screenVisualStyle";
import { cn } from "@/lib/utils";

export type ScreenTitleBarDisplayProps = {
  title?: string;
  className?: string;
  styleConfig?: ScreenTitleBarStyleConfig;
};

/** 对标 DataEase 顶部标题装饰条：居中标题 + 两侧渐变线 */
export function ScreenTitleBarDisplay({
  title = "数据大屏标题",
  className,
  styleConfig,
}: ScreenTitleBarDisplayProps) {
  const style = normalizeScreenTitleBarStyle(styleConfig);
  const accent = style.accentColor;

  return (
    <div
      className={cn(
        "pointer-events-none flex size-full min-h-0 items-center justify-center gap-4 px-6",
        className,
      )}
      data-screen-title-bar
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
        className="shrink-0 text-center text-lg font-semibold tracking-[0.12em]"
        style={{
          color: style.titleColor,
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
