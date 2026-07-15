import { chartColors } from "@/lib/chartPalette";

function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const d = m[1]!;
  return [
    Number.parseInt(d.slice(0, 2), 16),
    Number.parseInt(d.slice(2, 4), 16),
    Number.parseInt(d.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(a: string, b: string, ratio: number): string {
  const c1 = parseHex(a);
  const c2 = parseHex(b);
  if (!c1 || !c2) return a;
  const t = Math.max(0, Math.min(1, ratio));
  return toHex(
    c1[0] + (c2[0] - c1[0]) * t,
    c1[1] + (c2[1] - c1[1]) * t,
    c1[2] + (c2[2] - c1[2]) * t,
  );
}

function shiftLightness(hex: string, delta: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(rgb[0] + delta, rgb[1] + delta, rgb[2] + delta);
}

/** 由主题强调色推导图表系列色（首色为强调色，其余为同系变化） */
export function deriveAccentChartPalette(accent: string): string[] {
  const base = accent.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(base)) return [...chartColors];
  return [
    base,
    shiftLightness(base, 28),
    mixHex(base, "#12b76a", 0.35),
    mixHex(base, "#7a5af8", 0.4),
    mixHex(base, "#ee46bc", 0.35),
    shiftLightness(base, -32),
  ];
}

/** 强调色 → 看板作用域 CSS 变量（选中框、操作轨、图表主色等） */
export function themeAccentToScopeVars(accent: string): Record<string, string> {
  const base = accent.trim();
  return {
    "--dashboard-accent": base,
    "--dashboard-accent-soft": mixHex(base, "#ffffff", 0.82),
    "--dashboard-accent-muted": mixHex(base, "#ffffff", 0.55),
    "--dashboard-action-icon": base,
    "--dashboard-action-icon-hover": shiftLightness(base, -24),
    "--dashboard-chart-primary": base,
  };
}
