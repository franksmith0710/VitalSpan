import { describe, expect, it } from "vitest";
import { resolveChartColors } from "./chartPalette";

describe("chartPalette", () => {
  it("resolveChartColors returns preset palette", () => {
    expect(resolveChartColors("tech")[0]).toBe("#465fff");
  });

  it("resolveChartColors prefers custom colors", () => {
    expect(resolveChartColors("tech", ["#000000"])).toEqual(["#000000"]);
  });
});
