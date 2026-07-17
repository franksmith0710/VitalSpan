import { SCREEN_PANEL_GLOW } from "@/lib/screenTokens";
import { cn } from "@/lib/utils";

export type ScreenBorderDisplayProps = {
  className?: string;
};

/** 对标 DataEase 素材边框 + screen-panel 角标发光 */
export function ScreenBorderDisplay({ className }: ScreenBorderDisplayProps) {
  const corner = "absolute size-3 border-cyan-400/70";
  return (
    <div
      className={cn("pointer-events-none relative size-full min-h-0", className)}
      data-screen-border
      style={{ boxShadow: SCREEN_PANEL_GLOW }}
      aria-hidden
    >
      <div className="absolute inset-2 rounded-lg border border-cyan-500/30 bg-slate-900/20" />
      <div className="absolute inset-5 rounded-md border border-cyan-400/10" />
      <span className={cn(corner, "left-1 top-1 border-l-2 border-t-2")} />
      <span className={cn(corner, "right-1 top-1 border-r-2 border-t-2")} />
      <span className={cn(corner, "bottom-1 left-1 border-b-2 border-l-2")} />
      <span className={cn(corner, "bottom-1 right-1 border-b-2 border-r-2")} />
      <span className="absolute left-1/2 top-1 h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
      <span className="absolute bottom-1 left-1/2 h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      <span className="absolute left-3 top-1/2 h-16 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
      <span className="absolute right-3 top-1/2 h-16 w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />
    </div>
  );
}
