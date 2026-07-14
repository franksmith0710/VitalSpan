import { describe, expect, it } from "vitest";
import { chartInspectorCapabilities } from "./chartInspectorCapabilities";

describe("chartInspectorCapabilities", () => {
  it("disables legend for table", () => {
    expect(chartInspectorCapabilities("table").legend).toBe(false);
  });

  it("enables dataZoom for bar", () => {
    expect(chartInspectorCapabilities("bar").dataZoom).toBe(true);
  });

  it("enables legend for graph", () => {
    expect(chartInspectorCapabilities("graph").legend).toBe(true);
  });
});
