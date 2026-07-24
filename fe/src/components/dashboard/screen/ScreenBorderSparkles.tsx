import { useId } from "react";
import { cn } from "@/lib/utils";
import type { ScreenBorderSparkleConfig } from "@/lib/screenBorderSparkle";
import {
  BORDER_FLOW_GLOW_STROKE_PX,
  normalizeScreenBorderSparkle,
  trailLengthToMaskRadius,
} from "@/lib/screenBorderSparkle";
import type { ScreenBorderVariant } from "@/lib/screenVisualStyle";
import { getBorderFlowSegment } from "@/lib/screenBorderFlowPaths";

type ScreenBorderSparklesProps = {
  sparkles: ScreenBorderSparkleConfig[];
  variant: ScreenBorderVariant;
  className?: string;
  /** 隔离同页多实例的 SVG defs id（如画布 + 配置栏缩略图） */
  instanceScope?: string;
};

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

/**
 * 对标 sc-datav Demo1 header：path 与可见描边同坐标，径向渐变光斑 mask + animateMotion 裁切高亮线段。
 */
function MaskedFlowStroke({
  instanceScope,
  sparkleId,
  path,
  color,
  speed,
  phaseOffset,
  trailLengthPx,
}: {
  instanceScope: string;
  sparkleId: string;
  path: string;
  color: string;
  speed: number;
  phaseOffset: number;
  trailLengthPx: number;
}) {
  const uid = safeId(sparkleId);
  const scope = safeId(instanceScope);
  const gradId = `border-flow-grad-${scope}-${uid}`;
  const maskId = `border-flow-mask-${scope}-${uid}`;
  const begin = `${-phaseOffset * speed}s`;
  const maskRadius = trailLengthToMaskRadius(trailLengthPx);

  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          maskContentUnits="userSpaceOnUse"
        >
          <circle r={maskRadius} cx={0} cy={0} fill={`url(#${gradId})`}>
            <animateMotion
              dur={`${speed}s`}
              repeatCount="indefinite"
              restart="always"
              path={path}
              rotate="auto"
              begin={begin}
              calcMode="linear"
              keyPoints="0;1"
              keyTimes="0;1"
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
  instanceScope,
}: ScreenBorderSparklesProps) {
  const autoScope = useId();
  const scope = safeId(instanceScope ?? autoScope);

  if (sparkles.length === 0) return null;

  const segment = getBorderFlowSegment(variant, 0);

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
        const phaseOffset = index / sparkles.length;
        return (
          <MaskedFlowStroke
            key={sparkle.id}
            instanceScope={scope}
            sparkleId={sparkle.id}
            path={segment.path}
            color={sparkle.color}
            speed={sparkle.speed}
            phaseOffset={phaseOffset}
            trailLengthPx={sparkle.trailLength}
          />
        );
      })}
    </svg>
  );
}
