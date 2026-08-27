import { describe, expect, it } from "vitest";
import {
  computeSunLightFromMinutes,
  formatSunTimeLabel,
  parseSunTimeInput,
} from "@/components/charts/engine/maplibre/gisSunLight";

describe("gisSunLight", () => {
  it("formats and parses HH:MM", () => {
    expect(formatSunTimeLabel(17 * 60 + 36)).toBe("17:36");
    expect(parseSunTimeInput("17:36")).toBe(17 * 60 + 36);
  });

  it("raises light intensity near noon", () => {
    const noon = computeSunLightFromMinutes(12 * 60, 0.85);
    const night = computeSunLightFromMinutes(2 * 60, 0.85);
    expect(noon.intensity ?? 0).toBeGreaterThan(night.intensity ?? 0);
  });
});
