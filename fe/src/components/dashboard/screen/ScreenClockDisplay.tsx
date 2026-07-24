import { useEffect, useState } from "react";
import { formatScreenClockWithWeekday } from "@/lib/screenVisualAssets";
import type { ScreenClockStyleConfig } from "@/lib/screenVisualStyle";
import { normalizeScreenClockStyle } from "@/lib/screenVisualStyle";
import { screenTokens } from "@/lib/screenTokens";
import { cn } from "@/lib/utils";

export type ScreenClockDisplayProps = {
  className?: string;
  /** 预览顶栏紧凑模式 */
  compact?: boolean;
  showWeekday?: boolean;
  styleConfig?: ScreenClockStyleConfig;
};

export function ScreenClockDisplay({
  className,
  compact = false,
  showWeekday,
  styleConfig,
}: ScreenClockDisplayProps) {
  const style = normalizeScreenClockStyle(styleConfig);
  const resolvedShowWeekday = showWeekday ?? style.showWeekday;
  const [clock, setClock] = useState(() => formatScreenClockWithWeekday(new Date()));

  useEffect(() => {
    const intervalMs = style.showSeconds ? 1000 : 60_000;
    const timer = window.setInterval(
      () => setClock(formatScreenClockWithWeekday(new Date())),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [style.showSeconds]);

  const timeText = style.showSeconds ? clock.time : clock.time.slice(0, 16);

  if (compact) {
    return (
      <div
        className={cn("text-right leading-tight tabular-nums", className)}
        data-screen-clock
        style={{ color: style.color }}
      >
        <div className={screenTokens.clock} style={{ fontSize: style.fontSize }}>
          {timeText.slice(11)}
        </div>
        {resolvedShowWeekday ? <div className={screenTokens.weekday}>{clock.weekday}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center gap-1 px-2 text-center tabular-nums",
        className,
      )}
      data-screen-clock
      style={{ color: style.color }}
    >
      <div className={screenTokens.clockLarge} style={{ fontSize: style.fontSize }}>
        {timeText}
      </div>
      {resolvedShowWeekday ? <div className={screenTokens.weekday}>{clock.weekday}</div> : null}
    </div>
  );
}
