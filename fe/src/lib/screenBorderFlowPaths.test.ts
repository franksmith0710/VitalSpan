import { describe, expect, it } from "vitest";
import {
  BORDER_FLOW_SEGMENTS,
  getBorderFlowSegment,
  getBorderFlowSegments,
} from "./screenBorderFlowPaths";
import type { ScreenBorderVariant } from "./screenVisualStyle";

const VARIANTS = Object.keys(BORDER_FLOW_SEGMENTS) as ScreenBorderVariant[];

describe("screenBorderFlowPaths", () => {
  it("returns segments for every border variant", () => {
    for (const variant of VARIANTS) {
      const segments = getBorderFlowSegments(variant);
      expect(segments.length).toBeGreaterThan(0);
      for (const segment of segments) {
        expect(segment.path.length).toBeGreaterThan(0);
        expect(["loop", "pingpong"]).toContain(segment.motion);
      }
    }
  });

  it("cycles segments by sparkle index", () => {
    const segments = getBorderFlowSegments("border-5");
    expect(getBorderFlowSegment("border-5", 0)).toBe(segments[0]);
    expect(getBorderFlowSegment("border-5", segments.length)).toBe(segments[0]);
  });

  it("marks short accent lines as pingpong", () => {
    expect(getBorderFlowSegment("border-1", 1).motion).toBe("pingpong");
    expect(getBorderFlowSegment("border-5", 0).motion).toBe("pingpong");
    expect(getBorderFlowSegment("border-4", 0).motion).toBe("loop");
  });
});
