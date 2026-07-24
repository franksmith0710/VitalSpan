import type { ScreenBorderVariant } from "@/lib/screenVisualStyle";

/**
 * 与各边框变体可见描边对齐（viewBox 0 0 100 100）。
 * 流光 path 须与 screenBorderVariants 中 accent 线同坐标（sc-datav：stroke path === animateMotion path）。
 */
export const BORDER_FLOW_PATHS: Record<ScreenBorderVariant, string> = {
  /** inset-2 圆角内框 */
  "border-1":
    "M 10,8 L 90,8 Q 92,8 92,10 L 92,90 Q 92,92 90,92 L 10,92 Q 8,92 8,90 L 8,10 Q 8,8 10,8 Z",
  /** inset-3 内框 */
  "border-2": "M 12,12 L 88,12 L 88,88 L 12,88 Z",
  /** inset-2 虚线框 */
  "border-3": "M 8,8 L 92,8 L 92,92 L 8,92 Z",
  /** inset-2 外 accent 框 + inset-4 内框（沿内框 accent 线） */
  "border-4": "M 16,16 L 84,16 L 84,84 L 16,84 Z",
  /** inset-x-4 / inset-y-4 四向线条围合 */
  "border-5": "M 16,8 L 84,8 L 92,16 L 92,84 L 84,92 L 16,92 L 8,84 L 8,16 Z",
  /** inset-2 上下 border-t/b 中线 */
  "border-6": "M 8,9 L 92,9 L 92,91 L 8,91 Z",
  /** inset-5 accent 内框 */
  "border-7": "M 20,20 L 80,20 L 80,80 L 20,80 Z",
  /** inset-2 左右竖线围合 */
  "border-8": "M 8,8 L 8,92 L 92,92 L 92,8 Z",
  /** inset-2 圆角 accent 外框 + 顶部装饰条 */
  "border-9":
    "M 10,8 L 38,8 L 40,2 L 60,2 L 62,8 L 90,8 Q 92,8 92,10 L 92,90 Q 92,92 90,92 L 10,92 Q 8,92 8,90 L 8,10 Q 8,8 10,8 Z",
};

export type BorderFlowMotion = "loop";

export type BorderFlowSegment = {
  path: string;
  motion: BorderFlowMotion;
};

export function getBorderFlowSegments(variant: ScreenBorderVariant): BorderFlowSegment[] {
  const path = BORDER_FLOW_PATHS[variant] ?? BORDER_FLOW_PATHS["border-1"];
  return [{ path, motion: "loop" }];
}

export function getBorderFlowSegment(variant: ScreenBorderVariant, _index: number): BorderFlowSegment {
  return getBorderFlowSegments(variant)[0]!;
}
