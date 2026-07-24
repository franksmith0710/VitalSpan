import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN_CLOCK_STYLE,
  normalizeScreenClockStyle,
  normalizeScreenDateTimeStyle,
  normalizeScreenIconStyle,
  normalizeScreenShapeStyle,
  normalizeScreenVisualStyle,
} from "./screenVisualStyle";

describe("screenVisualStyle", () => {
  it("applies clock defaults when style is missing", () => {
    expect(normalizeScreenClockStyle()).toEqual(DEFAULT_SCREEN_CLOCK_STYLE);
  });

  it("merges partial datetime style", () => {
    expect(normalizeScreenDateTimeStyle({ timeFontSize: 28 }).timeFontSize).toBe(28);
    expect(normalizeScreenDateTimeStyle({ timeFontSize: 28 }).dateFontSize).toBe(14);
  });

  it("normalizes shape and icon style buckets", () => {
    expect(normalizeScreenShapeStyle({ shape: "triangle" }).shape).toBe("triangle");
    expect(normalizeScreenIconStyle({ icon: "home", size: 64 }).size).toBe(64);
  });

  it("normalizes full visual style buckets", () => {
    const style = normalizeScreenVisualStyle({
      clock: { fontSize: 20 },
      border: { glowEnabled: false, variant: "border-2" },
      shape: { strokeWidth: 3 },
      icon: { color: "#ffffff" },
    });
    expect(style.clock.fontSize).toBe(20);
    expect(style.border.glowEnabled).toBe(false);
    expect(style.border.variant).toBe("border-2");
    expect(style.shape.strokeWidth).toBe(3);
    expect(style.icon.color).toBe("#ffffff");
    expect(style.datetime.showSeconds).toBe(true);
  });
});
