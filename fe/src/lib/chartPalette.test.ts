import { describe, expect, it } from "vitest";
import { resolveChartColors, resolvePaletteId } from "./chartPalette";

describe("chartPalette", () => {
  it("resolveChartColors returns brand preset", () => {
    expect(resolveChartColors("default")[0]).toBe("#465fff");
  });

  it("resolveChartColors prefers custom colors", () => {
    expect(resolveChartColors("clarity", ["#000000"])).toEqual(["#000000"]);
  });

  it("maps legacy tech palette to clarity", () => {
    expect(resolvePaletteId("tech")).toBe("clarity");
    expect(resolveChartColors("tech")[0]).toBe("#0ba5ec");
  });
});
