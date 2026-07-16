import { describe, expect, it } from "vitest";
import { chartInspectorCapabilities, supportsEmbeddedShellLegend } from "./chartInspectorCapabilities";

describe("chartInspectorCapabilities", () => {
  it("disables legend for table", () => {
    expect(chartInspectorCapabilities("table").legend).toBe(false);
  });

  it("enables mark lines and conditional for bar", () => {
    const caps = chartInspectorCapabilities("bar");
    expect(caps.markLines).toBe(true);
    expect(caps.conditional).toBe(true);
    expect(caps.jump).toBe(true);
  });

  it("enables legend for graph", () => {
    expect(chartInspectorCapabilities("graph").legend).toBe(true);
  });

  it("uses shell legend only for line and bar", () => {
    expect(supportsEmbeddedShellLegend("bar")).toBe(true);
    expect(supportsEmbeddedShellLegend("line")).toBe(true);
    expect(supportsEmbeddedShellLegend("pie")).toBe(false);
    expect(supportsEmbeddedShellLegend("funnel")).toBe(false);
  });
});
