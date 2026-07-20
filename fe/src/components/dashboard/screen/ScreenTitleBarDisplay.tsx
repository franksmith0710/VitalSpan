import { SCREEN_TITLE_COLOR } from "@/lib/screenTokens";
import { cn } from "@/lib/utils";

export type ScreenTitleBarDisplayProps = {
  title?: string;
  className?: string;
};

/** 对标 DataEase 顶部标题装饰条：居中标题 + 两侧渐变线 */
export function ScreenTitleBarDisplay({
  title = "数据大屏标题",
  className,
}: ScreenTitleBarDisplayProps) {
  return (
    <div
      className={cn(
        "pointer-events-none flex size-full min-h-0 items-center justify-center gap-4 px-6",
        className,
      )}
      data-screen-title-bar
      aria-hidden
    >
      <span className="h-px min-w-0 flex-1 max-w-[8rem] bg-gradient-to-r from-transparent via-cyan-400/70 to-cyan-400/20" />
      <span
        className="shrink-0 text-center text-lg font-semibold tracking-[0.2em] text-cyan-100"
        style={{ color: SCREEN_TITLE_COLOR, textShadow: "0 0 20px rgba(34,211,238,0.35)" }}
      >
        {title}
      </span>
      <span className="h-px min-w-0 flex-1 max-w-[8rem] bg-gradient-to-l from-transparent via-cyan-400/70 to-cyan-400/20" />
    </div>
  );
}
