import { describe, expect, it } from "vitest";
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

  it("builds inline chart config from section headers with labels", () => {
    expect(buildStandardSectionChartConfig(["dim", "cnt"], "bar", { region: "province" }, "distribution")).toMatchObject({
      chartType: "bar-horizontal",
      dimensions: [{ field: "dim", label: "省份" }],
      metrics: [{ field: "cnt", label: "数量" }],
    });
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
