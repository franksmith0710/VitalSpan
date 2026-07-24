import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ScreenBorderSparkleConfig } from "@/lib/screenBorderSparkle";
import {
  BORDER_FLOW_STROKE_WIDTH_PX,
  BORDER_FLOW_TRAIL_SEGMENTS,
  normalizeScreenBorderSparkle,
} from "@/lib/screenBorderSparkle";
import type { ScreenBorderVariant } from "@/lib/screenVisualStyle";
import {
  getBorderFlowSegment,
  type BorderFlowMotion,
} from "@/lib/screenBorderFlowPaths";

type ScreenBorderSparklesProps = {
  sparkles: ScreenBorderSparkleConfig[];
  variant: ScreenBorderVariant;
  className?: string;
};

function glowLength(pathLength: number): number {
  return Math.min(Math.max(pathLength * 0.22, 8), 52);
}

function FlowStroke({
  path,
  color,
  motion,
  speed,
  phaseOffset,
}: {
  path: string;
  color: string;
  motion: BorderFlowMotion;
  speed: number;
  phaseOffset: number;
}) {
  const measureRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  useLayoutEffect(() => {
    const length = measureRef.current?.getTotalLength() ?? 0;
    setPathLength(length);
  }, [path]);

  if (pathLength <= 0) {
    return <path ref={measureRef} d={path} fill="none" stroke="none" visibility="hidden" />;
  }

  const streak = glowLength(pathLength);
  const dasharray = `${streak} ${pathLength}`;
  const phaseShift = phaseOffset * pathLength;
  const trailStep = speed * 0.07;
  const layers = BORDER_FLOW_TRAIL_SEGMENTS + 1;

  return (
    <>
      <path ref={measureRef} d={path} fill="none" stroke="none" visibility="hidden" />
      {Array.from({ length: layers }, (_, index) => {
        const trailOpacity = 1 - index * 0.32;
        const begin = `${-phaseOffset * speed - index * trailStep}s`;
        const blur = 2.5 + index * 0.8;
        const haloWidth = BORDER_FLOW_STROKE_WIDTH_PX + 2.5 + index * 0.6;

        const animateProps =
          motion === "pingpong"
            ? {
                attributeName: "stroke-dashoffset" as const,
                values: `${phaseShift};${phaseShift - pathLength};${phaseShift}`,
                keyTimes: "0;0.5;1",
                dur: `${speed}s`,
                repeatCount: "indefinite" as const,
                begin,
              }
            : {
                attributeName: "stroke-dashoffset" as const,
                from: phaseShift,
                to: phaseShift - pathLength,
                dur: `${speed}s`,
                repeatCount: "indefinite" as const,
                begin,
              };

        return (
          <g key={index} opacity={trailOpacity}>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={haloWidth}
              strokeLinecap="round"
              vectorEffect="nonScalingStroke"
              strokeDasharray={dasharray}
              strokeDashoffset={phaseShift}
              style={{ filter: `blur(${blur}px)` }}
            >
              <animate {...animateProps} />
            </path>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={BORDER_FLOW_STROKE_WIDTH_PX}
              strokeLinecap="round"
              vectorEffect="nonScalingStroke"
              strokeDasharray={dasharray}
              strokeDashoffset={phaseShift}
            >
              <animate {...animateProps} />
            </path>
          </g>
        );
      })}
    </>
  );
}

export function ScreenBorderSparkles({
  sparkles,
  variant,
  className,
}: ScreenBorderSparklesProps) {
  if (sparkles.length === 0) return null;

  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      data-screen-border-flow
      aria-hidden
    >
      {sparkles.map((raw, index) => {
        const sparkle = normalizeScreenBorderSparkle(raw);
        const segment = getBorderFlowSegment(variant, index);
        const phaseOffset = index / sparkles.length;
        return (
          <FlowStroke
            key={sparkle.id}
            path={segment.path}
            color={sparkle.color}
            motion={segment.motion}
            speed={sparkle.speed}
            phaseOffset={phaseOffset}
          />
        );
      })}
    </svg>
  );
}
