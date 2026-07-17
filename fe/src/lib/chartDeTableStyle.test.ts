import { describe, expect, it } from "vitest";
import {
  DEFAULT_TABLE_ZEBRA_BG,
  mergeChartTableStyle,
  resolveTableZebraBg,
} from "./chartDeTableStyle";

describe("chartDeTableStyle parity helpers", () => {
  it("resolveTableZebraBg prefers zebraBg over legacy zebraStriped", () => {
    expect(resolveTableZebraBg({ zebraBg: "#112233" })).toBe("#112233");
    expect(resolveTableZebraBg({ zebraStriped: true })).toBe(DEFAULT_TABLE_ZEBRA_BG);
    expect(resolveTableZebraBg({})).toBeUndefined();
  });

  it("mergeChartTableStyle lets chart override dashboard defaults", () => {
    expect(
      mergeChartTableStyle(
        { headerBg: "#ffffff" },
        { headerBg: "#000000", bodyBg: "#111111" },
      ),
    ).toEqual({ headerBg: "#ffffff", bodyBg: "#111111" });
  });
});
