import { describe, expect, it } from "vitest";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  patchChartDeTableStyle,
  readChartDeTableStyle,
  resolveTablePageSize,
  resolveTableSummaryColumns,
  computeTableSummaryValues,
} from "@/lib/chartDeTableStyle";

const cfg: ChartViewConfig = { chartType: "table", dataSourceId: "ds" };

describe("chartDeTableStyle", () => {
  it("T-TABLE-STYLE-01: patch and read round-trip", () => {
    const next = patchChartDeTableStyle(cfg, { pageSize: 20, wordWrap: true });
    expect(readChartDeTableStyle(next)).toMatchObject({ pageSize: 20, wordWrap: true });
  });

  it("T-TABLE-STYLE-02: resolveTablePageSize default 20", () => {
    expect(resolveTablePageSize(cfg)).toBe(20);
    expect(resolveTablePageSize(patchChartDeTableStyle(cfg, { pageSize: 100 }))).toBe(100);
  });

  it("T-TABLE-STYLE-03: resolve summary columns from metrics", () => {
    const cols = resolveTableSummaryColumns(
      ["region", "amount"],
      ["region", "amount"],
      [["华东", 10], ["华北", 20]],
      { metricFields: ["amount"] },
    );
    expect(cols).toEqual(["amount"]);
  });

  it("T-TABLE-STYLE-04: compute summary values", () => {
    const values = computeTableSummaryValues(
      ["region", "amount"],
      ["region", "amount"],
      [["华东", 10], ["华北", 20]],
      ["amount"],
    );
    expect(values).toEqual({ region: null, amount: 30 });
  });
});
