import { useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  buildCanvasRulerTicks,
  CANVAS_RULER_SIZE_PX,
  type CanvasRulerTick,
  type CanvasRulerTickKind,
} from "./canvasRulerUtils";

export type CanvasRulerProps = {
  orientation: "horizontal" | "vertical";
  designLength: number;
  scale: number;
  scrollOffsetPx: number;
  viewportPx: number;
  className?: string;
};

const TICK_LENGTH: Record<CanvasRulerTickKind, number> = {
  major: 10,
  minor: 7,
  micro: 4,
};

function tickColor(kind: CanvasRulerTickKind): string {
  if (kind === "major") return "bg-gray-500 dark:bg-gray-400";
  if (kind === "minor") return "bg-gray-400/90 dark:bg-gray-500/90";
  return "bg-gray-300 dark:bg-gray-600";
}

function RulerTick({
  tick,
  orientation,
}: {
  tick: CanvasRulerTick;
  orientation: CanvasRulerProps["orientation"];
}) {
  const isHorizontal = orientation === "horizontal";
  const tickLen = TICK_LENGTH[tick.kind];

  if (isHorizontal) {
    return (
      <div
        className="pointer-events-none absolute bottom-0"
        style={{ left: tick.positionPx, transform: "translateX(-50%)" }}
      >
        <div
          className={cn("w-px", tickColor(tick.kind))}
          style={{ height: tickLen }}
          aria-hidden
        />
        {tick.showLabel ? (
          <span
            className="absolute bottom-[12px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] leading-none font-medium text-gray-600 tabular-nums select-none dark:text-gray-300"
          >
            {tick.value}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none absolute right-0"
      style={{ top: tick.positionPx, transform: "translateY(-50%)" }}
    >
      <div
        className={cn("h-px", tickColor(tick.kind))}
        style={{ width: tickLen }}
        aria-hidden
      />
      {tick.showLabel ? (
        <span
          className="absolute top-1/2 right-[12px] -translate-y-1/2 whitespace-nowrap text-right text-[8px] leading-none font-medium text-gray-600 tabular-nums select-none dark:text-gray-300"
        >
          {tick.value}
        </span>
      ) : null}
    </div>
  );
}

export function CanvasRuler({
  orientation,
  designLength,
  scale,
  scrollOffsetPx,
  viewportPx,
  className,
}: CanvasRulerProps) {
  const ticks = useMemo(
    () => buildCanvasRulerTicks(designLength, scale, scrollOffsetPx, viewportPx),
    [designLength, scale, scrollOffsetPx, viewportPx],
  );
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      data-testid={`canvas-ruler-${orientation}`}
      className={cn(
        "relative shrink-0 overflow-hidden bg-[#e8eaef] dark:bg-[#111827]",
        isHorizontal
          ? "h-[var(--canvas-ruler-size)] border-b border-gray-300/80 dark:border-white/10"
          : "w-[var(--canvas-ruler-size)] border-r border-gray-300/80 dark:border-white/10",
        className,
      )}
      style={{ "--canvas-ruler-size": `${CANVAS_RULER_SIZE_PX}px` } as CSSProperties}
      aria-hidden
    >
      {ticks.map((tick) => (
        <RulerTick key={`${tick.kind}-${tick.value}`} tick={tick} orientation={orientation} />
      ))}
    </div>
  );
}
