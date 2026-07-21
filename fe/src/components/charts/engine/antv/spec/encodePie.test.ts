import { describe, expect, it } from "vitest";
import { encodePieRows } from "./encodePie";
import type { RenderSpec } from "@/components/charts/engine/types";

const spec: RenderSpec = {
  engine: "antv",
  chartType: "pie",
  styleVariant: "default",
  encoding: {
    dimensions: [{ field: "region", label: null }],
    metrics: [{ field: "amount", label: null }],
  },
  source: {},
};

describe("encodePieRows", () => {
  it("aggregates duplicate dimension values", () => {
    const rows = [
      ["华东", 10],
      ["华东", 5],
      ["华北", 8],
    ];
    const columns = ["region", "amount"];
    expect(encodePieRows(spec, rows, columns)).toEqual([
      { type: "华东", value: 15 },
      { type: "华北", value: 8 },
    ]);
  });
});
