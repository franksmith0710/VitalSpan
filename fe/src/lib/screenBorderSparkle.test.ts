import { describe, expect, it } from "vitest";
import {
  createScreenBorderSparkle,
  normalizeScreenBorderSparkle,
  normalizeScreenBorderSparkleStyle,
  trailLengthToMaskRadius,
  trailLengthToMaskRadiusPx,
} from "./screenBorderSparkle";

describe("screenBorderSparkle", () => {
  it("normalizes sparkle defaults", () => {
    const sparkle = normalizeScreenBorderSparkle(createScreenBorderSparkle());
    expect(sparkle.size).toBe(1);
    expect(sparkle.trailLength).toBe(48);
    expect(sparkle.direction).toBe("cw");
  });

  it("keeps at least one sparkle when style enabled", () => {
    const style = normalizeScreenBorderSparkleStyle({ enabled: true, sparkles: [] });
    expect(style.sparkles).toHaveLength(1);
  });

  it("maps trail length to stable viewBox mask radius", () => {
    expect(trailLengthToMaskRadius(8)).toBe(4);
    expect(trailLengthToMaskRadius(48)).toBe(9);
    expect(trailLengthToMaskRadius(120)).toBe(18);
  });

  it("maps trail length to pixel mask radius for flow overlay", () => {
    expect(trailLengthToMaskRadiusPx(8)).toBe(6);
    expect(trailLengthToMaskRadiusPx(48)).toBeCloseTo(21.82, 1);
    expect(trailLengthToMaskRadiusPx(120)).toBeCloseTo(54.55, 1);
  });
});
