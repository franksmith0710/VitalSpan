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

  it("resolves embedded layout without temporal dead zone on compact flag", () => {
    expect(() =>
      resolveEchartsChromeInsets(
        { legend: { show: true, position: "bottom" } },
        true,
        { series: [{ type: "bar", data: [1] }], xAxis: {}, yAxis: {} },
        { embedded: true },
      ),
    ).not.toThrow();
  });

  it("shows legend in embedded widgets by default", () => {
    const insets = resolveEchartsChromeInsets(
      {},
      false,
      { series: [{ type: "bar", data: [1] }], xAxis: {}, yAxis: {} },
      { embedded: true },
    );
    expect(insets.showLegend).toBe(true);
    expect(insets.compact).toBe(true);
  });

  it("hides legend in embedded widgets when explicitly disabled", () => {
    const insets = resolveEchartsChromeInsets(
      { legend: { show: false } },
      false,
      { series: [{ type: "bar", data: [1] }], xAxis: {}, yAxis: {} },
      { embedded: true },
    );
    expect(insets.showLegend).toBe(false);
  });

  it("shows legend by default in full-size preview", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [{ type: "bar", data: [1] }], xAxis: {}, yAxis: {} },
      {},
      false,
    );
    expect((option.legend as { show?: boolean }).show).toBe(true);
  });

  it("applies legend fontSize and position when enabled", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [{ type: "bar", data: [1] }], xAxis: {}, yAxis: {} },
      { legend: { show: true, fontSize: 20, position: "top" } },
      false,
      { layout: { embedded: true } },
    );
    const legend = option.legend as { show?: boolean; top?: number; textStyle?: { fontSize?: number } };
    expect(legend.show).toBe(true);
    expect(legend.textStyle?.fontSize).toBe(20);
    expect(legend.top).toBe(0);
  });

  it("defers legend to shell layout when shellLegend is enabled", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [{ type: "bar", name: "A", data: [1] }], xAxis: {}, yAxis: {} },
      { legend: { show: true, fontSize: 20, position: "bottom" } },
      false,
      { layout: { embedded: true, shellLegend: true } },
    );
    expect((option.legend as { show?: boolean }).show).toBe(false);
    const grid = option.grid as { bottom?: number };
    expect(grid.bottom).toBeLessThan(20);
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
      { legend: { show: true, position: "bottom" } },
      true,
      { series: [{ type: "bar", data: [1] }], xAxis: {}, yAxis: {} },
    );
    expect(insets.legendBottom).toBeGreaterThan(0);
    expect(insets.gridBottom).toBeGreaterThan(insets.legendBottom ?? 0);
  });

  it("reserves grid bottom for embedded cartesian charts with dataZoom", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [{ type: "line", data: [1, 2] }], xAxis: { type: "category" }, yAxis: {} },
      { legend: { show: true, position: "bottom" } },
      true,
      { layout: { embedded: true } },
    );
    const grid = option.grid as { bottom?: number; containLabel?: boolean };
    expect(grid.bottom).toBeGreaterThanOrEqual(30);
    expect(grid.containLabel).toBe(true);
    const slider = option.dataZoom?.[0] as { showDataShadow?: boolean; showDetail?: boolean };
    expect(slider.showDataShadow).toBe(false);
    expect(slider.showDetail).toBe(false);
  });

  it("shifts pie center when legend is on bottom", () => {
    const option = applyDeStyleToEchartsOption(
      { series: [{ type: "pie", data: [{ value: 1, name: "A" }] }] },
      { legend: { show: true, position: "bottom" } },
      false,
    );
    const pie = (option.series as Array<{ center?: [string, string] }>)[0];
    expect(pie?.center?.[1]).toBe("44%");
  });
});
