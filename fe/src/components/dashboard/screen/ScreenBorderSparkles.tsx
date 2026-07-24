import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ScreenBorderSparkleConfig } from "@/lib/screenBorderSparkle";
import {
  BORDER_FLOW_GLOW_STROKE_PX,
  normalizeScreenBorderSparkle,
} from "@/lib/screenBorderSparkle";
import type { ScreenBorderVariant } from "@/lib/screenVisualStyle";
import { getBorderFlowSegment } from "@/lib/screenBorderFlowPaths";

type ScreenBorderSparklesProps = {
  sparkles: ScreenBorderSparkleConfig[];
  variant: ScreenBorderVariant;
  className?: string;
};

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * 对标 sc-datav Demo1 header：path 与可见描边同坐标，径向渐变光斑 mask + animateMotion 裁切高亮线段。
 */
function MaskedFlowStroke({
  sparkleId,
  path,
  color,
  speed,
  phaseOffset,
  trailLengthPx,
  pxPerUnit,
}: {
  sparkleId: string;
  path: string;
  color: string;
  speed: number;
  phaseOffset: number;
  trailLengthPx: number;
  pxPerUnit: number;
}) {
  const uid = safeId(sparkleId);
  const gradId = `border-flow-grad-${uid}`;
  const maskId = `border-flow-mask-${uid}`;
  const begin = `${-phaseOffset * speed}s`;
  const maskRadius = Math.max(2, trailLengthPx / pxPerUnit);

  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={maskId}>
          <circle r={maskRadius} cx={0} cy={0} fill={`url(#${gradId})`}>
            <animateMotion
              dur={`${speed}s`}
              repeatCount="indefinite"
              path={path}
              rotate="auto"
              keyPoints="0;1"
              keyTimes="0;1"
              calcMode="linear"
              begin={begin}
            />
          </circle>
        </mask>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={BORDER_FLOW_GLOW_STROKE_PX}
        vectorEffect="nonScalingStroke"
        strokeLinecap="round"
        strokeLinejoin="round"
        mask={`url(#${maskId})`}
      />
    </g>
  );
}

export function ScreenBorderSparkles({
  sparkles,
  variant,
  className,
}: ScreenBorderSparklesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pxPerUnit, setPxPerUnit] = useState(4);

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      setPxPerUnit(Math.max(width, height, 1) / 100);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (sparkles.length === 0) return null;

  const segment = getBorderFlowSegment(variant, 0);

  return (
    <svg
      ref={svgRef}
      className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      data-screen-border-flow
      aria-hidden
    >
      {sparkles.map((raw, index) => {
        const sparkle = normalizeScreenBorderSparkle(raw);
        const phaseOffset = index / sparkles.length;
        return (
          <MaskedFlowStroke
            key={sparkle.id}
            sparkleId={sparkle.id}
            path={segment.path}
            color={sparkle.color}
            speed={sparkle.speed}
            phaseOffset={phaseOffset}
            trailLengthPx={sparkle.trailLength}
            pxPerUnit={pxPerUnit}
          />
        );
      })}
    </svg>
  );
}
