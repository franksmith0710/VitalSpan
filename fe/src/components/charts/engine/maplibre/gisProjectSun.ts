import {
  DEFAULT_GIS_SUN_ANIMATION_SPEED,
  DEFAULT_GIS_SUN_DATE,
  DEFAULT_GIS_SUN_NIGHT_SHADOW,
  DEFAULT_GIS_SUN_TIME_MINUTES,
} from "@/components/charts/engine/maplibre/gisSunLight";

export type GisProjectSun = {
  /** 启用太阳驱动光照（3D 挤出阴影方向） */
  enabled?: boolean;
  /** ISO 日期 YYYY-MM-DD */
  date?: string;
  /** 当天分钟数 0–1439 */
  timeMinutes?: number;
  /** 动画速度：模拟分钟/秒 */
  animationSpeed?: number;
  /** 夜间阴影强度 0–1 */
  nightShadow?: number;
  /** 循环日弧动画 */
  loop?: boolean;
};

export type ResolvedGisProjectSun = {
  enabled: boolean;
  date: string;
  timeMinutes: number;
  animationSpeed: number;
  nightShadow: number;
  loop: boolean;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveGisProjectSun(sun: GisProjectSun | undefined): ResolvedGisProjectSun {
  const timeRaw = Number(sun?.timeMinutes);
  const speedRaw = Number(sun?.animationSpeed);
  const shadowRaw = Number(sun?.nightShadow);
  return {
    enabled: sun?.enabled !== false,
    date: sun?.date && ISO_DATE.test(sun.date) ? sun.date : DEFAULT_GIS_SUN_DATE,
    timeMinutes:
      Number.isFinite(timeRaw) && timeRaw >= 0 && timeRaw <= 1439
        ? Math.round(timeRaw)
        : DEFAULT_GIS_SUN_TIME_MINUTES,
    animationSpeed:
      Number.isFinite(speedRaw) && speedRaw > 0 ? speedRaw : DEFAULT_GIS_SUN_ANIMATION_SPEED,
    nightShadow:
      Number.isFinite(shadowRaw) && shadowRaw >= 0 && shadowRaw <= 1
        ? shadowRaw
        : DEFAULT_GIS_SUN_NIGHT_SHADOW,
    loop: sun?.loop !== false,
  };
}

export function normalizeGisProjectSun(input: unknown): GisProjectSun | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as GisProjectSun;
  const next: GisProjectSun = {};
  if (raw.enabled === false) next.enabled = false;
  if (typeof raw.date === "string" && ISO_DATE.test(raw.date.trim())) {
    next.date = raw.date.trim();
  }
  const timeMinutes = Number(raw.timeMinutes);
  if (Number.isFinite(timeMinutes) && timeMinutes >= 0 && timeMinutes <= 1439) {
    next.timeMinutes = Math.round(timeMinutes);
  }
  const animationSpeed = Number(raw.animationSpeed);
  if (Number.isFinite(animationSpeed) && animationSpeed > 0) {
    next.animationSpeed = animationSpeed;
  }
  const nightShadow = Number(raw.nightShadow);
  if (Number.isFinite(nightShadow) && nightShadow >= 0 && nightShadow <= 1) {
    next.nightShadow = nightShadow;
  }
  if (raw.loop === false) next.loop = false;
  return Object.keys(next).length > 0 ? next : undefined;
}
