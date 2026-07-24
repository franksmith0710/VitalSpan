import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCREEN_CLOCK_STYLE,
  normalizeScreenClockStyle,
  normalizeScreenDateTimeStyle,
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

  it("normalizes full visual style buckets", () => {
    const style = normalizeScreenVisualStyle({
      clock: { fontSize: 20 },
      border: { glowEnabled: false },
    });
    expect(style.clock.fontSize).toBe(20);
    expect(style.border.glowEnabled).toBe(false);
    expect(style.datetime.showSeconds).toBe(true);
  });
});
