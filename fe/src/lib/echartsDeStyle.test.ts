import { describe, expect, it } from "vitest";
import {
  applyDeStyleToEchartsOption,
  resolveEchartsChromeInsets,
} from "./echartsDeStyle";

describe("applyDeStyleToEchartsOption", () => {
  it("adds dataZoom slider when enabled", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [{ type: "line", data: [1] }], xAxis: { type: "category" }, yAxis: {} },
      {},
      true,
    );
    expect(option.dataZoom).toHaveLength(2);
    const slider = option.dataZoom?.[0] as { showDataShadow?: boolean };
    expect(slider.showDataShadow).toBe(false);
  });

  it("hides legend when show is false", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [], legend: { show: true } },
      { legend: { show: false } },
      false,
    );
    expect((option.legend as { show?: boolean }).show).toBe(false);
  });

  it("stacks legend above dataZoom on bottom", () => {
    const insets = resolveEchartsChromeInsets(
      { legend: { position: "bottom" } },
      true,
      { series: [{ type: "bar", data: [1] }], xAxis: {}, yAxis: {} },
    );
    expect(insets.legendBottom).toBeGreaterThan(0);
    expect(insets.gridBottom).toBeGreaterThan(insets.legendBottom ?? 0);
  });

  it("reserves grid bottom for cartesian charts", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [{ type: "line", data: [1, 2] }], xAxis: { type: "category" }, yAxis: {} },
      { legend: { position: "bottom" } },
      true,
      { layout: { embedded: true } },
    );
    const grid = option.grid as { bottom?: number; containLabel?: boolean };
    expect(grid.bottom).toBeGreaterThanOrEqual(40);
    expect(grid.containLabel).toBe(true);
    const slider = option.dataZoom?.[0] as { showDataShadow?: boolean; showDetail?: boolean };
    expect(slider.showDataShadow).toBe(false);
    expect(slider.showDetail).toBe(false);
  });

  it("shifts pie center when legend is on bottom", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [{ type: "pie", data: [{ value: 1, name: "A" }] }] },
      { legend: { position: "bottom" } },
      false,
    );
    const pie = (option.series as Array<{ center?: [string, string] }>)[0];
    expect(pie?.center?.[1]).toBe("44%");
  });
});
