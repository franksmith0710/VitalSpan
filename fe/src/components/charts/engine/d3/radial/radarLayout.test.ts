import { describe, expect, it } from "vitest";
import { computeRadarLayout } from "./radarLayout";

describe("computeRadarLayout", () => {
  it("uses larger radius than legacy 38% on wide containers", () => {
    const legacyRadius = Math.min(432 - 40, 157 - 48) * 0.38;
    const layout = computeRadarLayout(432, 157, false, true);
    expect(layout.legendMode).toBe("none");
    expect(layout.radius).toBeGreaterThan(legacyRadius);
  });

  it("fills height on square containers", () => {
    const layout = computeRadarLayout(200, 200, false, true);
    expect(layout.radius).toBeGreaterThan(65);
  });
});
