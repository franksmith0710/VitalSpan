import type { ChartGeo3dStyle } from "@/lib/chartDeStyle";
import type { Geo3dStylePreset } from "@/components/charts/engine/three/geo3dVisualStyle";
import { resolveGeo3dStylePreset } from "@/components/charts/engine/three/geo3dVisualStyle";

export type PlatformLayerFlags = {
  highlight: boolean;
  rings: boolean;
  grid: boolean;
  ripple: boolean;
};

export type PlatformAccentColors = {
  highlight: string;
  grid: string;
  ripple: string;
};

export type ResolvedPlatformEffectsStyle = {
  layers: PlatformLayerFlags;
  colors: PlatformAccentColors;
  highlightOpacity: number;
  ringOpacity: readonly [number, number];
  gridOpacity: number;
  rippleOpacity: number;
  sizeScale: number;
};

export const DEFAULT_PLATFORM_HIGHLIGHT_OPACITY = 1;
export const DEFAULT_PLATFORM_RING_OPACITY = 0.3;
export const DEFAULT_PLATFORM_GRID_OPACITY = 0.1;
export const DEFAULT_PLATFORM_RIPPLE_OPACITY = 0.5;
export const DEFAULT_PLATFORM_SIZE_SCALE = 1;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function clamp01(value: number | undefined, fallback: number): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function clampSizeScale(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) return DEFAULT_PLATFORM_SIZE_SCALE;
  return Math.min(1.6, Math.max(0.4, value));
}

function normalizeHex(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !HEX_COLOR.test(trimmed)) return undefined;
  return trimmed.toLowerCase();
}

function paletteForMapPreset(preset: Geo3dStylePreset, isDark: boolean): PlatformAccentColors {
  if (preset === "classic") {
    return { highlight: "#fbdf88", grid: "#fbdf88", ripple: "#ea580c" };
  }
  if (preset === "tech") {
    return isDark
      ? { highlight: "#7dd3fc", grid: "#38bdf8", ripple: "#0ea5e9" }
      : { highlight: "#bae6fd", grid: "#38bdf8", ripple: "#0284c7" };
  }
  if (preset === "minimal") {
    return isDark
      ? { highlight: "#64748b", grid: "#475569", ripple: "#94a3b8" }
      : { highlight: "#cbd5e1", grid: "#94a3b8", ripple: "#64748b" };
  }
  return isDark
    ? { highlight: "#93c5fd", grid: "#60a5fa", ripple: "#3b82f6" }
    : { highlight: "#dbeafe", grid: "#60a5fa", ripple: "#2563eb" };
}

export function resolvePlatformLayerFlags(style: ChartGeo3dStyle, effectsOn: boolean): PlatformLayerFlags {
  if (!effectsOn) {
    return { highlight: false, rings: false, grid: false, ripple: false };
  }
  return {
    highlight: style.platformHighlight !== false,
    rings: style.platformRings !== false,
    grid: style.platformGrid !== false,
    ripple: style.platformRipple !== false,
  };
}

export function resolvePlatformAccentColors(
  style: ChartGeo3dStyle,
  mapPreset: Geo3dStylePreset,
  isDark: boolean,
): PlatformAccentColors {
  const preset = resolveGeo3dStylePreset(style);
  const defaults = paletteForMapPreset(mapPreset || preset, isDark);
  return {
    highlight: normalizeHex(style.platformHighlightColor) ?? defaults.highlight,
    grid: normalizeHex(style.platformGridColor) ?? defaults.grid,
    ripple: normalizeHex(style.platformRippleColor) ?? defaults.ripple,
  };
}

export function resolvePlatformHighlightColorHex(
  style: ChartGeo3dStyle,
  mapPreset: Geo3dStylePreset | undefined,
  isDark: boolean,
): string {
  return resolvePlatformAccentColors(style, mapPreset ?? resolveGeo3dStylePreset(style), isDark)
    .highlight;
}

export function resolvePlatformGridColorHex(
  style: ChartGeo3dStyle,
  mapPreset: Geo3dStylePreset | undefined,
  isDark: boolean,
): string {
  return resolvePlatformAccentColors(style, mapPreset ?? resolveGeo3dStylePreset(style), isDark).grid;
}

export function resolvePlatformRippleColorHex(
  style: ChartGeo3dStyle,
  mapPreset: Geo3dStylePreset | undefined,
  isDark: boolean,
): string {
  return resolvePlatformAccentColors(style, mapPreset ?? resolveGeo3dStylePreset(style), isDark)
    .ripple;
}

export function hasCustomPlatformHighlightColor(style: ChartGeo3dStyle): boolean {
  return Boolean(normalizeHex(style.platformHighlightColor));
}

export function hasCustomPlatformGridColor(style: ChartGeo3dStyle): boolean {
  return Boolean(normalizeHex(style.platformGridColor));
}

export function hasCustomPlatformRippleColor(style: ChartGeo3dStyle): boolean {
  return Boolean(normalizeHex(style.platformRippleColor));
}

export function resolvePlatformEffectsStyle(
  style: ChartGeo3dStyle,
  mapPreset: Geo3dStylePreset,
  isDark: boolean,
  effectsOn: boolean,
): ResolvedPlatformEffectsStyle {
  const layers = resolvePlatformLayerFlags(style, effectsOn);
  const ringBase = clamp01(style.platformRingOpacity, DEFAULT_PLATFORM_RING_OPACITY);
  return {
    layers,
    colors: resolvePlatformAccentColors(style, mapPreset, isDark),
    highlightOpacity: clamp01(style.platformHighlightOpacity, DEFAULT_PLATFORM_HIGHLIGHT_OPACITY),
    ringOpacity: [ringBase * 0.67, ringBase * 1.33],
    gridOpacity: clamp01(style.platformGridOpacity, DEFAULT_PLATFORM_GRID_OPACITY),
    rippleOpacity: clamp01(style.platformRippleOpacity, DEFAULT_PLATFORM_RIPPLE_OPACITY),
    sizeScale: clampSizeScale(style.platformSizeScale),
  };
}

export function buildPlatformEffectsContentSig(style: ChartGeo3dStyle, effectsOn: boolean): string {
  const layers = resolvePlatformLayerFlags(style, effectsOn);
  return [
    layers.highlight ? 1 : 0,
    layers.rings ? 1 : 0,
    layers.grid ? 1 : 0,
    layers.ripple ? 1 : 0,
    normalizeHex(style.platformHighlightColor) ?? "",
    normalizeHex(style.platformGridColor) ?? "",
    normalizeHex(style.platformRippleColor) ?? "",
    clamp01(style.platformHighlightOpacity, DEFAULT_PLATFORM_HIGHLIGHT_OPACITY),
    clamp01(style.platformRingOpacity, DEFAULT_PLATFORM_RING_OPACITY),
    clamp01(style.platformGridOpacity, DEFAULT_PLATFORM_GRID_OPACITY),
    clamp01(style.platformRippleOpacity, DEFAULT_PLATFORM_RIPPLE_OPACITY),
    clampSizeScale(style.platformSizeScale),
  ].join(",");
}
