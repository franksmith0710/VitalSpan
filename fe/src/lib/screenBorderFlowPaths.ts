import type { ScreenBorderVariant } from "@/lib/screenVisualStyle";

export type BorderFlowMotion = "loop" | "pingpong";

export type BorderFlowSegment = {
  path: string;
  motion: BorderFlowMotion;
};

/**
 * 与各边框变体实际绘制的线条一一对应（viewBox 0 0 100 100）。
 * - loop：闭合轮廓，沿线条绕圈
 * - pingpong：开放短线，端点间来回
 */
export const BORDER_FLOW_SEGMENTS: Record<ScreenBorderVariant, BorderFlowSegment[]> = {
  "border-1": [
    {
      path: "M 10,8 L 90,8 Q 92,8 92,10 L 92,90 Q 92,92 90,92 L 10,92 Q 8,92 8,90 L 8,10 Q 8,8 10,8 Z",
      motion: "loop",
    },
    { path: "M 42,4 L 58,4", motion: "pingpong" },
  ],
  "border-2": [
    { path: "M 12,12 L 88,12 L 88,88 L 12,88 Z", motion: "loop" },
  ],
  "border-3": [
    { path: "M 8,8 L 92,8 L 92,92 L 8,92 Z", motion: "loop" },
    { path: "M 8,8 L 22,8", motion: "pingpong" },
    { path: "M 78,8 L 92,8", motion: "pingpong" },
    { path: "M 8,90 L 22,90", motion: "pingpong" },
    { path: "M 78,90 L 92,90", motion: "pingpong" },
  ],
  "border-4": [
    { path: "M 8,8 L 92,8 L 92,92 L 8,92 Z", motion: "loop" },
  ],
  "border-5": [
    { path: "M 16,8 L 84,8", motion: "pingpong" },
    { path: "M 16,92 L 84,92", motion: "pingpong" },
    { path: "M 8,16 L 8,84", motion: "pingpong" },
    { path: "M 92,16 L 92,84", motion: "pingpong" },
  ],
  "border-6": [
    { path: "M 8,8 L 92,8", motion: "pingpong" },
    { path: "M 8,92 L 92,92", motion: "pingpong" },
    { path: "M 2,47 L 2,53", motion: "pingpong" },
    { path: "M 98,47 L 98,53", motion: "pingpong" },
  ],
  "border-7": [
    { path: "M 50,12 L 88,50 L 50,88 L 12,50 Z", motion: "loop" },
    { path: "M 20,20 L 80,20 L 80,80 L 20,80 Z", motion: "loop" },
  ],
  "border-8": [
    { path: "M 8,8 L 8,92", motion: "pingpong" },
    { path: "M 92,8 L 92,92", motion: "pingpong" },
    { path: "M 8,8 L 24,8", motion: "pingpong" },
    { path: "M 76,92 L 92,92", motion: "pingpong" },
  ],
  "border-9": [
    {
      path: "M 10,8 L 90,8 Q 92,8 92,10 L 92,90 Q 92,92 90,92 L 10,92 Q 8,92 8,90 L 8,10 Q 8,8 10,8 Z",
      motion: "loop",
    },
    { path: "M 40,2 L 60,2", motion: "pingpong" },
    { path: "M 40,98 L 60,98", motion: "pingpong" },
  ],
};

export function getBorderFlowSegments(variant: ScreenBorderVariant): BorderFlowSegment[] {
  return BORDER_FLOW_SEGMENTS[variant] ?? BORDER_FLOW_SEGMENTS["border-1"];
}

export function getBorderFlowSegment(variant: ScreenBorderVariant, index: number): BorderFlowSegment {
  const segments = getBorderFlowSegments(variant);
  return segments[index % segments.length]!;
}
