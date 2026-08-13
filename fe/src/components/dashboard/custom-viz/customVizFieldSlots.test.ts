import { describe, expect, it } from "vitest";
import { expandCustomVizFieldSlotsForUi } from "./customVizFieldSlots";

describe("expandCustomVizFieldSlotsForUi", () => {
  it("uses default dimension and metric slots when manifest fieldSlots is omitted", () => {
    const slots = expandCustomVizFieldSlotsForUi(undefined);
    expect(slots).toHaveLength(2);
    expect(slots.map((s) => s.kind)).toEqual(["dimension", "metric"]);
  });

  it("expands metrics.max into indexed UI slots", () => {
    const slots = expandCustomVizFieldSlotsForUi({
      dimensions: { min: 1, max: 1, label: "类别" },
      metrics: { min: 1, max: 2, label: "数值" },
    });
    expect(slots).toHaveLength(3);
    expect(slots.filter((s) => s.kind === "dimension").map((s) => s.index)).toEqual([0]);
    expect(slots.filter((s) => s.kind === "metric").map((s) => s.index)).toEqual([0, 1]);
    expect(slots[2]?.label).toBe("数值 2");
  });
});
