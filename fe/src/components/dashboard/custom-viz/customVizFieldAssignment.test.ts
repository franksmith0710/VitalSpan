import { describe, expect, it } from "vitest";
import { validateCustomVizFieldAssignment } from "./customVizFieldAssignment";

describe("validateCustomVizFieldAssignment", () => {
  it("rejects metric in dimension slot", () => {
    const result = validateCustomVizFieldAssignment("amount", { kind: "dimension", index: 0 }, "时间维度");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("指标字段");
  });

  it("rejects dimension in metric slot", () => {
    const result = validateCustomVizFieldAssignment("sale_date", { kind: "metric", index: 0 }, "数值指标 1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("维度字段");
  });

  it("requires date field for time dimension label", () => {
    const result = validateCustomVizFieldAssignment("province", { kind: "dimension", index: 0 }, "时间维度");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("sale_date");
  });

  it("accepts sale_date in time dimension slot", () => {
    expect(
      validateCustomVizFieldAssignment("sale_date", { kind: "dimension", index: 0 }, "时间维度", "date")
        .ok,
    ).toBe(true);
  });

  it("accepts amount in metric slot", () => {
    expect(
      validateCustomVizFieldAssignment("amount", { kind: "metric", index: 0 }, "数值指标 1").ok,
    ).toBe(true);
  });
});
