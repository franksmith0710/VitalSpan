import { describe, expect, it } from "vitest";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  patchChartDeTableStyle,
  readChartDeTableStyle,
  resolveTablePageSize,
} from "@/lib/chartDeTableStyle";

const cfg: ChartViewConfig = { chartType: "table", dataSourceId: "ds" };

describe("chartDeTableStyle", () => {
  it("T-TABLE-STYLE-01: patch and read round-trip", () => {
    const next = patchChartDeTableStyle(cfg, { pageSize: 20, wordWrap: true });
    expect(readChartDeTableStyle(next)).toMatchObject({ pageSize: 20, wordWrap: true });
  });

  it("T-TABLE-STYLE-02: resolveTablePageSize default 50", () => {
    expect(resolveTablePageSize(cfg)).toBe(50);
    expect(resolveTablePageSize(patchChartDeTableStyle(cfg, { pageSize: 100 }))).toBe(100);
  });
});
