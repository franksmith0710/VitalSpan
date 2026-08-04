import { describe, expect, it } from "vitest";
import {
  patchChartDeTableStyle,
  patchTableColumnWidthMode,
  readChartDeTableStyle,
  resolveEffectiveTableZebraBg,
} from "@/lib/chartDeTableStyle";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

const baseCfg = {
  chartType: "table-info",
  mode: "sql",
} as ChartViewConfig;

describe("chartDeTableStyle column width mode patches", () => {
  it("clears drag pixel widths when switching to auto", () => {
    const cfg = patchChartDeTableStyle(baseCfg, {
      columnWidthMode: "custom",
      columnWidths: { a: 40, b: 60 },
      columnWidthsPx: { a: 120, b: 180 },
    });
    const next = patchTableColumnWidthMode(cfg, "auto");
    const style = readChartDeTableStyle(next);
    expect(style.columnWidthMode).toBe("auto");
    expect(style.columnWidths).toBeUndefined();
    expect(style.columnWidthsPx).toBeUndefined();
  });

  it("clears percentage widths when switching to fixed", () => {
    const cfg = patchChartDeTableStyle(baseCfg, {
      columnWidthMode: "custom",
      columnWidths: { a: 30, b: 70 },
      columnWidthsPx: { a: 100 },
    });
    const next = patchTableColumnWidthMode(cfg, "fixed");
    const style = readChartDeTableStyle(next);
    expect(style.columnWidthMode).toBe("fixed");
    expect(style.columnWidths).toBeUndefined();
    expect(style.columnWidthsPx).toBeUndefined();
  });
});

describe("resolveEffectiveTableZebraBg", () => {
  it("respects zebraStriped=false and skips theme fallback", () => {
    expect(
      resolveEffectiveTableZebraBg({ zebraStriped: false }, { "--dashboard-table-zebra-bg": "#eee" }),
    ).toBeUndefined();
  });

  it("falls back to theme zebra when no component override", () => {
    expect(
      resolveEffectiveTableZebraBg({}, { "--dashboard-table-zebra-bg": "rgba(0,0,0,0.08)" }),
    ).toBe("rgba(0,0,0,0.08)");
  });
});

describe("resolveEffectiveTableZebraBg", () => {
  it("respects zebraStriped=false and skips theme fallback", () => {
    expect(
      resolveEffectiveTableZebraBg({ zebraStriped: false }, { "--dashboard-table-zebra-bg": "#eee" }),
    ).toBeUndefined();
  });

  it("falls back to theme zebra when no component override", () => {
    expect(
      resolveEffectiveTableZebraBg({}, { "--dashboard-table-zebra-bg": "rgba(0,0,0,0.08)" }),
    ).toBe("rgba(0,0,0,0.08)");
  });
});
