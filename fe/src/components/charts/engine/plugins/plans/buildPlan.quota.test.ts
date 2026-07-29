import { describe, expect, it } from "vitest";
import { buildPlanForType } from "./buildPlan";
import type { ChartViewModel } from "@/components/charts/engine/types";

function quotaVm(rows: unknown[][], columns: string[], metricField: string): ChartViewModel {
  return {
    chartType: "gauge",
    styleVariant: "default",
    engine: "antv",
    encoding: {
      dimensions: [],
      metrics: [{ field: metricField, label: null }],
    },
    dataset: { rows, columns },
    source: {},
  };
}

describe("buildPlanForType quota charts", () => {
  it("gauge aggregates metric across all rows", () => {
    const plan = buildPlanForType(
      "gauge",
      quotaVm(
        [
          [10],
          [20],
          [30],
        ],
        ["amount"],
        "amount",
      ),
    );
    expect(plan.options.rawValue).toBe(60);
  });

  it("liquid aggregates metric across all rows", () => {
    const plan = buildPlanForType(
      "liquid",
      quotaVm(
        [
          [0.2],
          [0.3],
        ],
        ["ratio"],
        "ratio",
      ),
    );
    expect(plan.options.rawValue).toBe(0.5);
  });
});

describe("buildPlanForType scatter encoding", () => {
  it("uses series dimension for color and X/Y metrics for axes", () => {
    const plan = buildPlanForType("scatter", {
      chartType: "scatter",
      styleVariant: "default",
      engine: "antv",
      encoding: {
        dimensions: [{ field: "series", label: null }],
        metrics: [
          { field: "x", label: null },
          { field: "y", label: null },
        ],
      },
      dataset: {
        rows: [
          ["A", 10, 20],
          ["B", 15, 25],
        ],
        columns: ["series", "x", "y"],
      },
      source: {},
    });
    expect(plan.options.colorField).toBe("series");
    const data = plan.options.data as Array<{ x: number; y: number; series: string }>;
    expect(data[0]).toMatchObject({ x: 10, y: 20, series: "A" });
    expect(data[1]).toMatchObject({ x: 15, y: 25, series: "B" });
  });
});
