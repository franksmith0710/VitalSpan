import { describe, expect, it } from "vitest";
import { resetChartTypeCatalogCache } from "@/lib/chartRegistry";
import { resolveChartFieldRule, resolveEffectiveChartFieldRule } from "@/lib/chartFieldRules";

describe("resolveChartFieldRule gis-map", () => {
  it("fallback and backend snapshot allow five OD dimensions", () => {
    resetChartTypeCatalogCache();
    const rule = resolveChartFieldRule("gis-map");
    expect(rule.maxDimensions).toBeGreaterThanOrEqual(5);
    expect(rule.minMetrics).toBe(0);
    expect(rule.maxMetrics).toBeGreaterThanOrEqual(1);
  });

  it("effective rule matches DE axis blueprint for OD flyline", () => {
    const rule = resolveEffectiveChartFieldRule("gis-map");
    expect(rule.maxDimensions).toBeGreaterThanOrEqual(5);
    expect(rule.minMetrics).toBe(0);
  });
});
