import { describe, expect, it } from "vitest";
import { buildChartViewModel } from "@/components/charts/engine/buildChartViewModel";
import { buildPlanForType } from "@/components/charts/engine/plugins/plans/buildPlan";
import {
  buildStandardSectionChartConfig,
  defaultLivePresentationMode,
  detectSuspiciousTimeSeries,
  humanizeSectionHeaders,
  isChartSection,
  resolveSectionChartType,
} from "./standardAnalysisPresentation";

describe("standardAnalysisPresentation", () => {
  it("humanizes internal column names", () => {
    expect(humanizeSectionHeaders(["dim", "cnt"])).toEqual(["维度", "数量"]);
    expect(humanizeSectionHeaders(["d", "cnt"])).toEqual(["日期", "数量"]);
  });

  it("detects chart sections from renderSpec", () => {
    expect(
      isChartSection({ kind: "chart", chartType: "bar", columns: ["dim", "cnt"], rows: [] }),
    ).toBe(true);
    expect(
      isChartSection({ kind: "table", columns: ["status", "cnt"], rows: [] }),
    ).toBe(false);
  });

  it("defaults to chart for chart sections", () => {
    expect(
      defaultLivePresentationMode({
        kind: "chart",
        chartType: "line",
        columns: ["d", "cnt"],
        rows: [],
      }),
    ).toBe("chart");
    expect(
      defaultLivePresentationMode({
        kind: "chart",
        chartType: "bar",
        columns: ["dim", "cnt"],
        rows: [],
      }),
    ).toBe("chart");
    expect(
      defaultLivePresentationMode({
        kind: "table",
        columns: ["status", "cnt"],
        rows: [],
      }),
    ).toBe("table");
  });

  it("maps distribution bar to horizontal bar chart type", () => {
    expect(resolveSectionChartType("bar")).toBe("bar-horizontal");
    expect(resolveSectionChartType("line")).toBe("line");
  });

  it("builds inline chart config aligned with table column labels", () => {
    expect(buildStandardSectionChartConfig(["dim", "cnt"], "bar")).toMatchObject({
      chartType: "bar-horizontal",
      dimensions: [{ field: "dim", label: "维度" }],
      metrics: [{ field: "cnt", label: "数量" }],
    });
    expect(buildStandardSectionChartConfig(["d", "cnt"], "line")).toMatchObject({
      chartType: "line",
      dimensions: [{ field: "d", label: "日期" }],
      metrics: [{ field: "cnt", label: "数量" }],
    });
  });

  it("defaults lifecycle chart sections to chart mode", () => {
    expect(
      defaultLivePresentationMode({
        kind: "chart",
        chartType: "bar",
        columns: ["dim", "cnt"],
        rows: [],
      }),
    ).toBe("chart");
  });

  it("encodes bar chart points matching table rows", () => {
    const headers = ["dim", "cnt"];
    const rows: (string | number)[][] = [
      ["办公耗材", 120],
      ["电子产品", 80],
    ];
    const config = buildStandardSectionChartConfig(headers, "bar");
    const vm = buildChartViewModel(config, { columns: headers, rows });
    const plan = buildPlanForType("bar-horizontal", vm);
    const data = plan.options.data as Array<{ __category__: string; __value__: number }>;
    expect(data).toHaveLength(2);
    expect(data).toEqual(
      expect.arrayContaining([
        { __category__: "办公耗材", __value__: 120 },
        { __category__: "电子产品", __value__: 80 },
      ]),
    );
  });

  it("encodes line chart points matching table rows", () => {
    const headers = ["d", "cnt"];
    const rows: (string | number)[][] = [
      ["2026-08-01", 12],
      ["2026-08-02", 18],
    ];
    const config = buildStandardSectionChartConfig(headers, "line");
    const vm = buildChartViewModel(config, { columns: headers, rows });
    const plan = buildPlanForType("line", vm);
    const data = plan.options.data as Array<{ __category__: string; __value__: number }>;
    expect(data).toEqual(
      expect.arrayContaining([
        { __category__: "2026-08-01", __value__: 12 },
        { __category__: "2026-08-02", __value__: 18 },
      ]),
    );
  });

  it("flags epoch date as suspicious time series", () => {
    expect(
      detectSuspiciousTimeSeries("trend", ["d", "cnt"], [["1970-01-01", 34]]),
    ).toMatch(/1970-01-01/);
    expect(
      detectSuspiciousTimeSeries("distribution", ["dim", "cnt"], [["上海市", 10]]),
    ).toBeNull();
  });
});
