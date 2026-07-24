import { describe, expect, it } from "vitest";
import {
  createScreenBorderSparkle,
  normalizeScreenBorderSparkle,
  normalizeScreenBorderSparkleStyle,
} from "./screenBorderSparkle";

describe("screenBorderSparkle", () => {
  it("normalizes sparkle defaults", () => {
    const sparkle = normalizeScreenBorderSparkle(createScreenBorderSparkle());
    expect(sparkle.size).toBe(2);
    expect(sparkle.trailLength).toBe(48);
    expect(sparkle.direction).toBe("cw");
  });

  it("keeps at least one sparkle when style enabled", () => {
    const style = normalizeScreenBorderSparkleStyle({ enabled: true, sparkles: [] });
    expect(style.sparkles).toHaveLength(1);
  });
});
