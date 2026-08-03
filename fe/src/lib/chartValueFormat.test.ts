import { describe, expect, it } from "vitest";
import {
  formatChartValue,
  formatTableCellValue,
  resolveChartValueFormat,
} from "./chartValueFormat";

describe("chartValueFormat", () => {
  it("merges deStyle label over dashboard numberFormat", () => {
    const fmt = resolveChartValueFormat(
      { formatType: "percent", thousandSeparator: false, decimals: 1, unit: "万" },
      { type: "number", thousandSeparator: true, decimals: 2, unit: "千" },
    );
    expect(fmt.type).toBe("percent");
    expect(fmt.thousandSeparator).toBe(false);
    expect(fmt.decimals).toBe(1);
    expect(fmt.unit).toBe("万");
  });

  it("formats chart values with thousand separator", () => {
    expect(formatChartValue(1234567, { type: "auto", thousandSeparator: true })).toBe("1,234,567");
  });

  it("formats numeric table cells", () => {
    expect(formatTableCellValue(1000, { type: "auto", thousandSeparator: true })).toBe("1,000");
    expect(formatTableCellValue("hello", { type: "auto" })).toBe("hello");
  });
});
