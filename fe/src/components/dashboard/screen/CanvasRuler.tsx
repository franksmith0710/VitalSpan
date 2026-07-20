import { useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  buildCanvasRulerTicks,
  CANVAS_RULER_SIZE_PX,
  DATA_SCREEN_RULER_LABEL,
  DATA_SCREEN_RULER_TICK_MAJOR,
  DATA_SCREEN_RULER_TICK_MICRO,
  DATA_SCREEN_RULER_TICK_MINOR,
  type CanvasRulerTick,
  type CanvasRulerTickKind,
} from "./canvasRulerUtils";
import { canvasRulerSurfaceClass } from "./canvasRulerChrome";

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

const TICK_COLOR: Record<CanvasRulerTickKind, string> = {
  major: DATA_SCREEN_RULER_TICK_MAJOR,
  minor: DATA_SCREEN_RULER_TICK_MINOR,
  micro: DATA_SCREEN_RULER_TICK_MICRO,
};

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
          className="w-px"
          style={{ height: tickLen, backgroundColor: TICK_COLOR[tick.kind] }}
          aria-hidden
        />
        {tick.showLabel ? (
          <span
            className="absolute bottom-[12px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] leading-none font-medium tabular-nums select-none"
            style={{ color: DATA_SCREEN_RULER_LABEL }}
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
        className="h-px"
        style={{ width: tickLen, backgroundColor: TICK_COLOR[tick.kind] }}
        aria-hidden
      />
      {tick.showLabel ? (
        <span
          className="absolute top-1/2 right-[12px] -translate-y-1/2 whitespace-nowrap text-right text-[8px] leading-none font-medium tabular-nums select-none"
          style={{ color: DATA_SCREEN_RULER_LABEL }}
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
        canvasRulerSurfaceClass,
        isHorizontal
          ? "h-[var(--canvas-ruler-size)] border-b border-[var(--canvas-ruler-edge)]"
          : "w-[var(--canvas-ruler-size)] border-r border-[var(--canvas-ruler-edge)]",
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
