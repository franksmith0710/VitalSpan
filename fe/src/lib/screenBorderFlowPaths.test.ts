import { describe, expect, it } from "vitest";
import {
  BORDER_FLOW_PATHS,
  getBorderFlowSegment,
  getBorderFlowSegments,
} from "./screenBorderFlowPaths";
import type { ScreenBorderVariant } from "./screenVisualStyle";

const VARIANTS = Object.keys(BORDER_FLOW_PATHS) as ScreenBorderVariant[];

describe("screenBorderFlowPaths", () => {
  it("returns a visible-line path for every border variant", () => {
    for (const variant of VARIANTS) {
      const segments = getBorderFlowSegments(variant);
      expect(segments).toHaveLength(1);
      expect(segments[0]?.path).toBe(BORDER_FLOW_PATHS[variant]);
      expect(segments[0]?.motion).toBe("loop");
    }
  });

  it("uses distinct paths per border style", () => {
    const paths = VARIANTS.map((variant) => getBorderFlowSegment(variant, 0).path);
    expect(new Set(paths).size).toBe(VARIANTS.length);
  });
});
