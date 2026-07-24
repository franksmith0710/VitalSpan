import { SCREEN_ACCENT } from "@/lib/screenTokens";

/** 流光描边宽度（与边框线重合，固定像素） */
export const BORDER_FLOW_STROKE_WIDTH_PX = 1.5;
/** 流光拖尾层数（沿同一条线的渐隐光带） */
export const BORDER_FLOW_TRAIL_SEGMENTS = 2;
/** @deprecated 使用 BORDER_FLOW_STROKE_WIDTH_PX */
export const BORDER_FLOW_DOT_SIZE_PX = BORDER_FLOW_STROKE_WIDTH_PX;

export type ScreenBorderSparkleDirection = "cw" | "ccw";

export type ScreenBorderSparkleConfig = {
  id: string;
  color?: string;
  /** @deprecated 大小固定，仅保留字段兼容旧数据 */
  size?: number;
  /** 绕边框一圈的秒数 */
  speed?: number;
  /** @deprecated 拖影固定开启 */
  trailEnabled?: boolean;
  /** @deprecated 拖影长度固定 */
  trailLength?: number;
  /** @deprecated 起始位置由序号自动均分 */
  offset?: number;
  /** @deprecated 方向固定顺时针 */
  direction?: ScreenBorderSparkleDirection;
};

export type ScreenBorderSparkleStyleConfig = {
  enabled?: boolean;
  sparkles?: ScreenBorderSparkleConfig[];
};

export const DEFAULT_SCREEN_BORDER_SPARKLE: Required<
  Omit<ScreenBorderSparkleConfig, "id">
> = {
  color: SCREEN_ACCENT,
  size: BORDER_FLOW_DOT_SIZE_PX,
  speed: 4,
  trailEnabled: true,
  trailLength: BORDER_FLOW_TRAIL_SEGMENTS,
  offset: 0,
  direction: "cw",
};

export function createScreenBorderSparkle(
  partial?: Partial<ScreenBorderSparkleConfig>,
): ScreenBorderSparkleConfig {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    color: partial?.color ?? DEFAULT_SCREEN_BORDER_SPARKLE.color,
    size: partial?.size ?? DEFAULT_SCREEN_BORDER_SPARKLE.size,
    speed: partial?.speed ?? DEFAULT_SCREEN_BORDER_SPARKLE.speed,
    trailEnabled: partial?.trailEnabled ?? DEFAULT_SCREEN_BORDER_SPARKLE.trailEnabled,
    trailLength: partial?.trailLength ?? DEFAULT_SCREEN_BORDER_SPARKLE.trailLength,
    offset: partial?.offset ?? DEFAULT_SCREEN_BORDER_SPARKLE.offset,
    direction: partial?.direction ?? DEFAULT_SCREEN_BORDER_SPARKLE.direction,
  };
}

export function normalizeScreenBorderSparkle(
  raw?: ScreenBorderSparkleConfig,
): Required<ScreenBorderSparkleConfig> {
  const base = createScreenBorderSparkle(raw);
  return {
    id: base.id,
    color: base.color ?? DEFAULT_SCREEN_BORDER_SPARKLE.color,
    size: BORDER_FLOW_STROKE_WIDTH_PX,
    speed: clamp(base.speed ?? DEFAULT_SCREEN_BORDER_SPARKLE.speed, 1, 20),
    trailEnabled: true,
    trailLength: BORDER_FLOW_TRAIL_SEGMENTS,
    offset: 0,
    direction: "cw",
  };
}

export function normalizeScreenBorderSparkleStyle(
  raw?: ScreenBorderSparkleStyleConfig,
): Required<ScreenBorderSparkleStyleConfig> & {
  sparkles: Required<ScreenBorderSparkleConfig>[];
} {
  const sparkles = (raw?.sparkles ?? []).map((item) => normalizeScreenBorderSparkle(item));
  return {
    enabled: raw?.enabled ?? false,
    sparkles: sparkles.length > 0 ? sparkles : [normalizeScreenBorderSparkle(createScreenBorderSparkle())],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
