import { describe, expect, it } from "vitest";
import { applyChartStyleChain } from "@/components/charts/engine/applyChartStyleChain";
import { buildChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import { buildStyleContext } from "@/components/charts/engine/buildStyleContext";
import { buildChartViewModel } from "@/components/charts/engine/buildChartViewModel";
import { buildD3DispatchPayload } from "@/components/charts/engine/d3/views/buildRenderConfig";
import type { ChartRenderPlan } from "@/components/charts/engine/buildChartRenderPlan";
import type { ChartStyleContext } from "@/components/charts/engine/types";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

const barConfig: ChartViewConfig = {
  chartType: "bar",
  dataSourceId: "ds",
  mode: "sql",
  sql: "select 1",
  dimensions: [{ field: "x" }],
  metrics: [{ field: "y" }],
};

const dualConfig: ChartViewConfig = {
  chartType: "chart-mix",
  dataSourceId: "ds",
  mode: "sql",
  sql: "select 1",
  dimensions: [{ field: "sale_date" }],
  metrics: [{ field: "amount" }, { field: "amount2" }],
  nativeBody: {
    deFeatures: {
      dataZoom: true,
      markLines: [{ id: "m1", enabled: true, value: 50, lineStyle: "dashed", color: "#000" }],
      conditionalRules: [{ id: "c1", enabled: true, operator: "gte", value: 10, color: "#12b76a" }],
    },
    deStyle: { label: { show: true } },
  },
};

const areaConfig: ChartViewConfig = {
  chartType: "area",
  dataSourceId: "ds",
  mode: "sql",
  sql: "select 1",
  dimensions: [{ field: "sale_date" }],
  metrics: [{ field: "amount" }],
  nativeBody: {
    deFeatures: { dataZoom: true },
    deStyle: { label: { show: true } },
  },
};

const hbarConfig: ChartViewConfig = {
  chartType: "bar-horizontal",
  dataSourceId: "ds",
  mode: "sql",
  sql: "select 1",
  dimensions: [{ field: "region" }],
  metrics: [{ field: "amount" }],
  nativeBody: {
    deFeatures: {
      dataZoom: true,
      markLines: [{ id: "m1", enabled: true, value: 100, lineStyle: "solid", color: "#000" }],
    },
  },
};

function baseStyle(overrides: Partial<ChartStyleContext> = {}): ChartStyleContext {
  return {
    scheme: "light",
    deStyle: {},
    deFeatures: {},
    chartColors: ["#465fff"],
    dataScreenSurface: false,
    showLabel: false,
    showTooltip: true,
    seriesGradient: false,
    dataZoom: false,
    labelPresentation: { fontSize: 12 },
    tooltipPresentation: { fontSize: 12 },
    shellLegend: false,
    embedEdit: false,
    ...overrides,
  };
}

describe("chart config contract L2", () => {
  it("applyChartStyleChain injects dataZoom for DualAxes plan", () => {
    const plan: ChartRenderPlan = {
      kind: "d3",
      plotType: "DualAxes",
      options: { data: [[], []], xField: "__category__", yField: ["__value__", "__value__"] },
    };
    const next = applyChartStyleChain(plan, baseStyle({ dataZoom: true }), dualConfig);
    expect(next.options.__dataZoom).toBe(true);
  });

  it("applyChartStyleChain injects markLines and conditional rules", () => {
    const plan: ChartRenderPlan = {
      kind: "d3",
      plotType: "Column",
      options: { data: [], xField: "x", yField: "y" },
    };
    const style = baseStyle({
      deFeatures: {
        markLines: [{ id: "m1", enabled: true, value: 10, lineStyle: "solid", color: "#000" }],
        conditionalRules: [{ id: "c1", enabled: true, operator: "gte", value: 5, color: "#f00" }],
      },
    });
    const next = applyChartStyleChain(plan, style, barConfig);
    expect(next.options.__markLines).toHaveLength(1);
    expect(next.options.__conditionalRules).toHaveLength(1);
  });

  it("dual axes dispatch payload carries dataZoom and showLabel", () => {
    const vm = buildChartViewModel(dualConfig, {
      columns: ["sale_date", "amount", "amount2"],
      rows: [
        ["2025-07-01", 100, 80],
        ["2025-07-02", 200, 120],
      ],
    });
    const style = buildStyleContext({ config: dualConfig, chartColors: ["#465fff", "#12b76a"] });
    const plan = applyChartStyleChain(buildChartRenderPlan(vm), style, dualConfig);
    const payload = buildD3DispatchPayload(
      { viewModel: vm, style, chartConfig: dualConfig, isDark: false },
      plan,
      400,
      300,
    );
    expect(payload?.kind).toBe("dualAxes");
    if (payload?.kind === "dualAxes") {
      expect(payload.config.dataZoom).toBe(true);
      expect(payload.config.showLabel).toBe(true);
      expect(payload.config.markLines).toHaveLength(1);
    }
  });

  it("area cartesian config passes dataZoom and showLabel", () => {
    const vm = buildChartViewModel(areaConfig, {
      columns: ["sale_date", "amount"],
      rows: [
        ["2025-07-01", 100],
        ["2025-07-02", 200],
      ],
    });
    const style = buildStyleContext({ config: areaConfig, chartColors: ["#465fff"] });
    const plan = applyChartStyleChain(buildChartRenderPlan(vm), style, areaConfig);
    expect(plan.options.__dataZoom).toBe(true);
    expect(style.showLabel).toBe(true);
  });

  it("horizontal bar plan receives dataZoom flag", () => {
    const vm = buildChartViewModel(hbarConfig, {
      columns: ["region", "amount"],
      rows: [
        ["华东", 100],
        ["华北", 200],
      ],
    });
    const style = buildStyleContext({ config: hbarConfig, chartColors: ["#465fff"] });
    const plan = applyChartStyleChain(buildChartRenderPlan(vm), { ...style, dataZoom: true }, hbarConfig);
    expect(plan.options.__dataZoom).toBe(true);
    expect(plan.options.__markLines).toHaveLength(1);
  });

  it("buildStyleContext merges dashboard defaults into presentation props", () => {
    const config: ChartViewConfig = {
      chartType: "bar",
      dataSourceId: "ds",
      mode: "sql",
      sql: "select 1",
      dimensions: [{ field: "x" }],
      metrics: [{ field: "y" }],
    };
    const style = buildStyleContext({
      config,
      chartColors: ["#465fff"],
      dashboardDefaults: {
        chartLabelShow: true,
        seriesGradient: true,
        tooltipShow: true,
        chartLabelStyle: { fontSize: 15, color: "#112233" },
        chartTooltipStyle: { fontSize: 14, color: "#aabbcc", background: "#222222" },
      },
    });
    expect(style.seriesGradient).toBe(true);
    expect(style.labelPresentation).toEqual({ fontSize: 15, color: "#112233" });
    expect(style.tooltipPresentation).toEqual({
      fontSize: 14,
      color: "#aabbcc",
      background: "#222222",
    });

    const vm = buildChartViewModel(config, {
      columns: ["x", "y"],
      rows: [
        ["a", 1],
        ["b", 2],
      ],
    });
    const plan = applyChartStyleChain(buildChartRenderPlan(vm), style, config);
    expect(plan.options.__seriesGradient).toBe(true);
    expect(plan.options.__labelColor).toBe("#112233");
    expect(plan.options.__tooltipPresentation).toMatchObject({ background: "#222222" });

    const payload = buildD3DispatchPayload(
      { viewModel: vm, style, chartConfig: config, isDark: false },
      plan,
      400,
      300,
    );
    expect(payload?.kind).toBe("cartesian");
    if (payload?.kind === "cartesian") {
      expect(payload.config.labelColor).toBe("#112233");
      expect(payload.config.seriesGradient).toBe(true);
      expect(payload.config.tooltipPresentation?.background).toBe("#222222");
    }
  });
});
