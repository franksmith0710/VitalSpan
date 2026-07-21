import { describe, expect, it } from "vitest";
import "@/components/charts/engine/plugins/index";
import { BUILTIN_PLUGIN_DEFS } from "@/components/charts/engine/plugins/metadata";
import {
  chartDataSlotBlueprint,
  chartRenderRequiredCounts,
} from "@/components/dashboard/chartFieldSlots";
import { sanitizeChartFieldsForValidate } from "@/lib/chartFieldRules";
import { buildChartRenderModel } from "@/lib/buildChartRenderModel";
import { BACKEND_CATALOG_FIELD_RULES } from "./chartCatalogBackendFieldRules";
import {
  assertCatalogSmokeCoverage,
  CHART_CATALOG_SMOKE_CASES,
  smokeCaseToConfig,
} from "./chartCatalogSmokeFixtures";

const ACTIVE_TYPES = BUILTIN_PLUGIN_DEFS.filter((d) => !d.deprecated).map((d) => d.type);

function filledDims(count: number) {
  return Array.from({ length: count }, (_, i) => ({ field: `dim_${i}` }));
}

function filledMetrics(count: number) {
  return Array.from({ length: count }, (_, i) => ({ field: `met_${i}` }));
}

describe("chart catalog L3 FIELD", () => {
  assertCatalogSmokeCoverage();

  it("T-VIZ-R32-001: backend fieldRule snapshot covers all active types", () => {
    for (const type of ACTIVE_TYPES) {
      expect(BACKEND_CATALOG_FIELD_RULES[type], type).toBeDefined();
    }
  });

  it("T-VIZ-R32-002: smoke fixtures satisfy backend min/max field counts", () => {
    for (const item of CHART_CATALOG_SMOKE_CASES) {
      const rule = BACKEND_CATALOG_FIELD_RULES[item.type]!;
      const dimCount = item.dimensions.filter((d) => d.field?.trim()).length;
      const metCount = item.metrics.filter((m) => m.field?.trim()).length;
      expect(dimCount, `${item.type} dims`).toBeGreaterThanOrEqual(rule.minDimensions);
      expect(dimCount, `${item.type} dims`).toBeLessThanOrEqual(rule.maxDimensions);
      expect(metCount, `${item.type} metrics`).toBeGreaterThanOrEqual(rule.minMetrics);
      expect(metCount, `${item.type} metrics`).toBeLessThanOrEqual(rule.maxMetrics);
    }
  });

  it("T-VIZ-R32-003: chartRenderRequiredCounts respects backend minima", () => {
    for (const type of ACTIVE_TYPES) {
      const rule = BACKEND_CATALOG_FIELD_RULES[type]!;
      const counts = chartRenderRequiredCounts(type);
      expect(counts.minDimensions, type).toBeGreaterThanOrEqual(rule.minDimensions);
      expect(counts.minMetrics, type).toBeGreaterThanOrEqual(rule.minMetrics);
    }
  });

  it("T-VIZ-R32-004: each active type exposes DE slot blueprint", () => {
    for (const type of ACTIVE_TYPES) {
      const slots = chartDataSlotBlueprint(type);
      expect(slots.length, type).toBeGreaterThan(0);
      expect(slots.some((s) => s.label.length > 0), type).toBe(true);
    }
  });

  it.each(CHART_CATALOG_SMOKE_CASES.map((c) => [c.type, c] as const))(
    "T-VIZ-R32-005 %s: valid fixture passes buildChartRenderModel",
    (_type, item) => {
      const model = buildChartRenderModel(smokeCaseToConfig(item), item.columns, item.rows);
      expect(model.kind).toBe("ready");
    },
  );

  it("T-VIZ-R32-006: missing required dimension yields error", () => {
    const line = smokeCaseToConfig(CHART_CATALOG_SMOKE_CASES.find((c) => c.type === "line")!);
    const model = buildChartRenderModel(
      { ...line, dimensions: [{ field: "" }] },
      ["sale_date", "amount"],
      [["2025-07-01", 100]],
    );
    expect(model.kind).toBe("error");
  });

  it("T-VIZ-R32-007: sankey requires two dimensions", () => {
    const sankey = smokeCaseToConfig(CHART_CATALOG_SMOKE_CASES.find((c) => c.type === "sankey")!);
    const model = buildChartRenderModel(
      { ...sankey, dimensions: [{ field: "source" }] },
      ["source", "target", "weight"],
      [["A", "B", 1]],
    );
    expect(model.kind).toBe("error");
    if (model.kind === "error") {
      expect(model.message).toMatch(/起止|维度/);
    }
  });

  it("T-VIZ-R32-008: graph allows zero metrics", () => {
    const graph = smokeCaseToConfig(CHART_CATALOG_SMOKE_CASES.find((c) => c.type === "graph")!);
    const model = buildChartRenderModel(graph, ["source", "target"], [["A", "B"]]);
    expect(model.kind).toBe("ready");
  });

  it("T-VIZ-R32-009: dual-axis types require at least two metrics in rule", () => {
    for (const type of ["chart-mix", "chart-mix-group", "chart-mix-stack", "chart-mix-dual-line"]) {
      const rule = BACKEND_CATALOG_FIELD_RULES[type]!;
      expect(rule.minMetrics).toBeGreaterThanOrEqual(2);
    }
  });

  it("T-VIZ-R32-010: sanitize slot capacity respects backend max", () => {
    const rule = BACKEND_CATALOG_FIELD_RULES.line!;
    const cfg = smokeCaseToConfig(CHART_CATALOG_SMOKE_CASES.find((c) => c.type === "line")!);
    const over = {
      ...cfg,
      dimensions: filledDims(rule.maxDimensions + 2),
      metrics: filledMetrics(rule.maxMetrics + 2),
    };
    const trimmed = sanitizeChartFieldsForValidate(over);
    expect(trimmed.dimensions?.length).toBeLessThanOrEqual(rule.maxDimensions);
    expect(trimmed.metrics?.length).toBeLessThanOrEqual(rule.maxMetrics);
  });
});
