import { useEffect, useState } from "react";
import { formatScreenClockWithWeekday } from "@/lib/screenVisualAssets";
import { screenTokens } from "@/lib/screenTokens";
import { cn } from "@/lib/utils";

export type ScreenClockDisplayProps = {
  className?: string;
  /** 预览顶栏紧凑模式 */
  compact?: boolean;
  showWeekday?: boolean;
};

export function ScreenClockDisplay({
  className,
  compact = false,
  showWeekday = true,
}: ScreenClockDisplayProps) {
  const [clock, setClock] = useState(() => formatScreenClockWithWeekday(new Date()));

  useEffect(() => {
    const timer = window.setInterval(
      () => setClock(formatScreenClockWithWeekday(new Date())),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);

  if (compact) {
    return (
      <div className={cn("text-right leading-tight", className)} data-screen-clock>
        <div className={screenTokens.clock}>{clock.time.slice(11)}</div>
        {showWeekday ? <div className={screenTokens.weekday}>{clock.weekday}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center gap-1 px-2 text-center",
        className,
      )}
      data-screen-clock
    >
      <div className={screenTokens.clockLarge}>{clock.time}</div>
      {showWeekday ? <div className={screenTokens.weekday}>{clock.weekday}</div> : null}
    </div>
  );
}
