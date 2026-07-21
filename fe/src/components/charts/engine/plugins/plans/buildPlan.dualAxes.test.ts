import { describe, expect, it } from "vitest";
import { buildPlanForType } from "./buildPlan";
import type { ChartViewModel } from "@/components/charts/engine/types";

function dualVm(
  chartType: string,
  rows: unknown[][],
  columns: string[],
  dims: Array<{ field: string }>,
  metrics: Array<{ field: string }>,
): ChartViewModel {
  return {
    chartType,
    styleVariant: "default",
    engine: "antv",
    encoding: { dimensions: dims, metrics },
    dataset: { rows, columns },
    source: {},
  };
}

describe("buildPlanForType dual axes DE slot mapping", () => {
  const rows = [
    ["2025-07-01", "华东", 100, 80],
    ["2025-07-02", "华北", 200, 120],
    ["2025-07-03", "华南", 150, 90],
  ];
  const columns = ["sale_date", "region", "amount", "amount2"];
  const dims = [{ field: "sale_date" }, { field: "region" }];
  const metrics = [{ field: "amount" }, { field: "amount2" }];

  it("maps metrics[0] to column (right) and metrics[1] to line (left)", () => {
    const plan = buildPlanForType(
      "chart-mix",
      dualVm("chart-mix", rows, columns, dims, metrics),
    );
    expect(plan.plotType).toBe("DualAxes");
    expect(plan.options.lineLabels).toEqual(["amount2", "amount"]);
    const data = plan.options.data as [
      Array<{ __category__: string; __value__: number }>,
      Array<{ __category__: string; __value__: number; __series__?: string }>,
    ];
    expect(data[0]!.every((d) => !("__series__" in d) || d.__series__ === "")).toBe(true);
    expect(data[0]![0]).toMatchObject({ __category__: "2025-07-01", __value__: 80 });
    expect(data[1]!.some((d) => d.__series__ === "华东")).toBe(true);
  });

  it("passes columnSeriesField for stack mode", () => {
    const plan = buildPlanForType(
      "chart-mix-stack",
      dualVm("chart-mix-stack", rows, columns, dims, metrics),
    );
    expect(plan.options.columnSeriesField).toBe("__series__");
    const geom = plan.options.geometryOptions as [{ geometry: string }, { isStack?: boolean }];
    expect(geom[1]?.isStack).toBe(true);
  });

  it("aggregates dual-line on category axis only", () => {
    const plan = buildPlanForType(
      "chart-mix-dual-line",
      dualVm("chart-mix-dual-line", rows, columns, dims, metrics),
    );
    const data = plan.options.data as [Array<{ __category__: string }>, Array<{ __category__: string }>];
    expect(data[0]!.length).toBe(3);
    expect(data[1]!.length).toBe(3);
  });
});
