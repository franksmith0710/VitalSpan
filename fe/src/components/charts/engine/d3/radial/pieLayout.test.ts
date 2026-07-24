import { describe, expect, it } from "vitest";
import { computePieLayout } from "./pieLayout";

describe("computePieLayout", () => {
  it("uses right-side legend on wide containers", () => {
    const wide = computePieLayout(400, 160, true);
    const wideNoLegend = computePieLayout(400, 160, false);

    expect(wide.legendMode).toBe("right");
    expect(wide.maxR).toBeGreaterThan(wideNoLegend.maxR * 0.55);
    expect(wide.maxR).toBeCloseTo((160 - 16) / 2, 0);
  });

  it("fills height on wide layout instead of centering tiny pie", () => {
    const layout = computePieLayout(432, 157, true);
    expect(layout.legendMode).toBe("right");
    expect(layout.maxR).toBeGreaterThan(60);
  });

  it("reserves bottom margin for inline legend on square containers", () => {
    const withLegend = computePieLayout(200, 200, true, { position: "bottom" });
    const withoutLegend = computePieLayout(200, 200, false);

    expect(withLegend.legendMode).toBe("inline");
    expect(withLegend.margin.bottom).toBeGreaterThan(withoutLegend.margin.bottom);
    expect(withLegend.maxR).toBeLessThan(withoutLegend.maxR);
  });
});
