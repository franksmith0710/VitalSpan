import { describe, expect, it } from "vitest";
import { computePieLayout } from "./pieLayout";

describe("computePieLayout", () => {
  it("uses larger radius fraction area on wide containers with right legend", () => {
    const square = computePieLayout(200, 200, true);
    const wide = computePieLayout(400, 160, true);

    expect(wide.legendMode).toBe("right");
    expect(wide.maxR).toBeGreaterThan(square.maxR * 0.85);
  });

  it("fills height on wide layout instead of centering tiny pie", () => {
    const layout = computePieLayout(432, 157, true);
    expect(layout.legendMode).toBe("right");
    expect(layout.maxR).toBeGreaterThan(60);
  });
});
