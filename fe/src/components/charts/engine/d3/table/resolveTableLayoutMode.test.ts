import { describe, expect, it } from "vitest";
import {
  buildTableColumnWidthPlan,
  resolveEffectiveColumnWidthMode,
} from "./resolveTableLayoutMode";

describe("resolveTableLayoutMode", () => {
  it("respects explicit column width mode", () => {
    expect(resolveEffectiveColumnWidthMode("auto", 12)).toBe("auto");
    expect(resolveEffectiveColumnWidthMode("fixed", 2)).toBe("fixed");
  });

  it("defaults to fixed when many columns and mode unset", () => {
    expect(resolveEffectiveColumnWidthMode(undefined, 6)).toBe("fixed");
    expect(resolveEffectiveColumnWidthMode(undefined, 3)).toBe("auto");
  });

  it("auto mode splits columns equally", () => {
    const plan = buildTableColumnWidthPlan({
      mode: "auto",
      displayCols: ["a", "b"],
      showSeriesNumber: false,
    });
    expect(plan.contentScroll).toBe(false);
    expect(plan.columnWidths).toEqual({ a: "50%", b: "50%" });
  });

  it("fixed mode uses pixel widths and enables horizontal scroll", () => {
    const plan = buildTableColumnWidthPlan({
      mode: "fixed",
      displayCols: ["region", "amount"],
      showSeriesNumber: false,
      measuredWidthsPx: { region: 120, amount: 88 },
    });
    expect(plan.contentScroll).toBe(true);
    expect(plan.columnWidths).toEqual({ region: "120px", amount: "88px" });
  });

  it("custom mode applies configured percentages", () => {
    const plan = buildTableColumnWidthPlan({
      mode: "custom",
      displayCols: ["a", "b"],
      showSeriesNumber: false,
      columnWidthsPct: { a: 30, b: 70 },
    });
    expect(plan.columnWidths).toEqual({ a: "30%", b: "70%" });
  });
});
