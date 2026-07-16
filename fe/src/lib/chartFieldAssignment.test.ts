import { describe, expect, it } from "vitest";
import {
  resolveAutoAssignTarget,
  validateFieldAssignment,
} from "./chartFieldAssignment";

describe("chartFieldAssignment", () => {
  it("allows sale_date on line category axis and amount on metric axis", () => {
    const cfg = { dimensions: [{ field: "" }], metrics: [{ field: "" }] };
    expect(
      validateFieldAssignment("sale_date", { kind: "dimension", index: 0 }, "line").ok,
    ).toBe(true);
    expect(
      validateFieldAssignment("amount", { kind: "metric", index: 0 }, "line").ok,
    ).toBe(true);
    expect(resolveAutoAssignTarget(cfg, "line", "sale_date")).toEqual({
      target: { kind: "dimension", index: 0 },
    });
    expect(resolveAutoAssignTarget(cfg, "line", "amount")).toEqual({
      target: { kind: "metric", index: 0 },
    });
  });

  it("rejects metric field in dimension slot", () => {
    const result = validateFieldAssignment(
      "amount",
      { kind: "dimension", index: 0 },
      "line",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("指标字段");
    }
  });

  it("rejects non-date field on timeline dimension", () => {
    const result = validateFieldAssignment(
      "region",
      { kind: "dimension", index: 0 },
      "timeline",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("时间");
    }
  });

  it("allows region_id on map geo dimension (demo mysql id mapping)", () => {
    const result = validateFieldAssignment(
      "region_id",
      { kind: "dimension", index: 0 },
      "map",
    );
    expect(result.ok).toBe(true);
  });
});
