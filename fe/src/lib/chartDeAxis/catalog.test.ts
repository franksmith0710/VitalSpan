import { describe, expect, it } from "vitest";
import {
  DE_AXIS_CATALOG,
  deriveFieldRuleFromDeCatalog,
  getDeAxisBlueprint,
  getDeAxisSpecs,
} from "@/lib/chartDeAxis";
import { BUILTIN_PLUGIN_DEFS } from "@/components/charts/engine/plugins/metadata";

const ACTIVE_TYPES = BUILTIN_PLUGIN_DEFS.filter((d) => !d.deprecated).map((d) => d.type);

describe("chartDeAxis catalog", () => {
  it("covers all active chart types", () => {
    for (const type of ACTIVE_TYPES) {
      expect(DE_AXIS_CATALOG[type], type).toBeDefined();
      expect(getDeAxisSpecs(type).length, type).toBeGreaterThan(0);
      expect(getDeAxisBlueprint(type).length, type).toBeGreaterThan(0);
    }
  });

  it("kpi has metric-only axis (no dimension slot)", () => {
    const slots = getDeAxisBlueprint("kpi");
    expect(slots).toHaveLength(1);
    expect(slots[0]?.label).toBe("指标 / 度量");
    expect(slots[0]?.fieldType).toBe("metric");
    expect(deriveFieldRuleFromDeCatalog("kpi")).toEqual({
      minDimensions: 0,
      maxDimensions: 0,
      minMetrics: 1,
      maxMetrics: 1,
    });
  });

  it("stock-line uses single yAxis with 4 metric slots", () => {
    const slots = getDeAxisBlueprint("stock-line");
    const ySlots = slots.filter((s) => s.axisId === "yAxis");
    expect(ySlots).toHaveLength(4);
    expect(ySlots.every((s) => s.fieldType === "metric")).toBe(true);
  });

  it("table-info uses both-type data column axis", () => {
    const slots = getDeAxisBlueprint("table-info");
    expect(slots[0]?.fieldType).toBe("both");
    expect(slots[0]?.label).toBe("数据列");
  });

  it("multi-scatter DE axis order and labels", () => {
    expect(getDeAxisBlueprint("multi-scatter").map((s) => s.label)).toEqual([
      "颜色 / 维度",
      "X 轴 / 时间维度或指标",
      "Y 轴 / 指标",
      "明暗 / 指标",
      "气泡大小 / 指标",
    ]);
  });

  it("chart-mix-dual-line includes extBubble dimension slot", () => {
    const bubble = getDeAxisBlueprint("chart-mix-dual-line").find((s) => s.axisId === "extBubble");
    expect(bubble?.label).toBe("右子类别 / 维度");
    expect(bubble?.fieldType).toBe("dimension");
  });

  it("DE parity matrix: every catalog entry has valid field types", () => {
    for (const [type, entry] of Object.entries(DE_AXIS_CATALOG)) {
      for (const spec of entry.specs) {
        expect(["dimension", "metric", "both"]).toContain(spec.fieldType);
        expect(spec.limit).toBeGreaterThan(0);
      }
      const rule = deriveFieldRuleFromDeCatalog(type);
      expect(rule.maxDimensions).toBeGreaterThanOrEqual(rule.minDimensions);
      expect(rule.maxMetrics).toBeGreaterThanOrEqual(rule.minMetrics);
    }
  });
});
