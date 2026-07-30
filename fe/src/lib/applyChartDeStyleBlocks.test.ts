import { describe, expect, it } from "vitest";
import {
  applyChartDeStyleBlocksToPlan,
  readCartesianStyleFromPlanOptions,
  resolveBarBandPadding,
  resolveCartesianLineSmooth,
  resolveGaugeValuePercent,
} from "@/lib/applyChartDeStyleBlocks";
import type { ChartDeStyle } from "@/lib/chartDeStyle";

describe("applyChartDeStyleBlocksToPlan", () => {
  it("maps cartesian and axis blocks to plan options", () => {
    const deStyle: ChartDeStyle = {
      cartesian: { barWidthRatio: 0.7, barRadius: 4, lineSmooth: true },
      axis: { x: { name: "月份" }, y: { name: "销售额" } },
    };
    const plan = applyChartDeStyleBlocksToPlan(
      { kind: "d3", plotType: "Line", empty: false, options: {} },
      deStyle,
    );
    expect(plan.options.__barWidthRatio).toBe(0.7);
    expect(plan.options.__barRadius).toBe(4);
    expect(plan.options.smooth).toBe(true);
    expect(plan.options.__axisStyle).toEqual(deStyle.axis);
  });

  it("lineSmooth false overrides styleVariant smooth on line plans", () => {
    const plan = applyChartDeStyleBlocksToPlan(
      { kind: "d3", plotType: "Line", empty: false, options: { smooth: true } },
      { cartesian: { lineSmooth: false } },
      { styleVariant: "smooth" },
    );
    expect(plan.options.smooth).toBe(false);
  });

  it("falls back to styleVariant smooth when lineSmooth is unset", () => {
    const plan = applyChartDeStyleBlocksToPlan(
      { kind: "d3", plotType: "Line", empty: false, options: {} },
      {},
      { styleVariant: "smooth" },
    );
    expect(plan.options.smooth).toBe(true);
  });

  it("maps sankey treemap and circlePacking blocks to plan options", () => {
    const deStyle: ChartDeStyle = {
      sankey: { nodeWidth: 16, nodeGap: 12, linkOpacity: 0.6 },
      treemap: { paddingInner: 5, paddingOuter: 7, cellRadius: 4 },
      circlePacking: { layoutPadding: 3, labelMinRadius: 22 },
    };
    const plan = applyChartDeStyleBlocksToPlan(
      { kind: "d3", plotType: "Sankey", empty: false, options: {} },
      deStyle,
    );
    expect(plan.options.__sankeyNodeWidth).toBe(16);
    expect(plan.options.__sankeyNodeGap).toBe(12);
    expect(plan.options.__sankeyLinkOpacity).toBe(0.6);
    expect(plan.options.__treemapPaddingInner).toBe(5);
    expect(plan.options.__treemapPaddingOuter).toBe(7);
    expect(plan.options.__treemapCellRadius).toBe(4);
    expect(plan.options.__circlePackingPadding).toBe(3);
    expect(plan.options.__circlePackingLabelMinRadius).toBe(22);
  });

  it("maps quadrant and compare shape blocks to plan options", () => {
    const deStyle: ChartDeStyle = {
      quadrant: { lineColor: "#ff0000", lineWidth: 2, showRegionBg: true, regionOpacity: 0.2 },
      progressBar: { trackOpacity: 0.5 },
      bullet: { targetLineWidth: 3, rangeOpacity: 0.7 },
      stockLine: { bodyWidthRatio: 0.75 },
    };
    const plan = applyChartDeStyleBlocksToPlan(
      { kind: "d3", plotType: "Quadrant", empty: false, options: {} },
      deStyle,
    );
    expect(plan.options.__quadrantLineColor).toBe("#ff0000");
    expect(plan.options.__quadrantLineWidth).toBe(2);
    expect(plan.options.__progressBarTrackOpacity).toBe(0.5);
    expect(plan.options.__bulletTargetLineWidth).toBe(3);
    expect(plan.options.__stockBodyWidthRatio).toBe(0.75);
  });
});

describe("resolveCartesianLineSmooth", () => {
  it("prefers explicit lineSmooth over plan and variant", () => {
    expect(
      resolveCartesianLineSmooth({ lineSmooth: false, planSmooth: true, styleVariant: "smooth" }),
    ).toBe(false);
    expect(
      resolveCartesianLineSmooth({ lineSmooth: true, planSmooth: false, styleVariant: "default" }),
    ).toBe(true);
  });
});

describe("resolveBarBandPadding", () => {
  it("converts bar width ratio to band padding", () => {
    expect(resolveBarBandPadding(0.55)).toBeCloseTo(0.45, 2);
  });
});

describe("readCartesianStyleFromPlanOptions", () => {
  it("reads cartesian style fields from plan options", () => {
    expect(
      readCartesianStyleFromPlanOptions({
        __barWidthRatio: 0.7,
        __barRadius: 5,
        __pointSize: 6,
        smooth: true,
        __axisStyle: { x: { name: "类目" } },
      }),
    ).toEqual({
      barWidthRatio: 0.7,
      barRadius: 5,
      pointSize: 6,
      areaOpacity: undefined,
      smooth: true,
      axisStyle: { x: { name: "类目" } },
    });
  });
});

describe("resolveGaugeValuePercent", () => {
  it("maps raw value into min/max range", () => {
    expect(resolveGaugeValuePercent({ __gaugeMin: 0, __gaugeMax: 200 }, 100, 0)).toBe(0.5);
    expect(resolveGaugeValuePercent({ __gaugeMin: 20, __gaugeMax: 120 }, 70, 0)).toBe(0.5);
  });
});
