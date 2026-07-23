import { describe, expect, it, vi, beforeEach } from "vitest";
import * as d3 from "d3";
import { layoutD3InlineLegend } from "./d3Legend";
import {
  emitSeriesFocus,
  resetSeriesInteraction,
  toggleSeriesVisibility,
} from "./interactionBus";

const theme = {
  legendText: "#333",
  gridLine: "#eee",
  accent: "#465fff",
} as const;

describe("d3Legend interactive", () => {
  beforeEach(() => {
    resetSeriesInteraction();
  });

  it("dims non-focused legend items on series focus", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const svg = d3.select(container).append("svg").attr("width", 400).attr("height", 120);
    const cleanup = layoutD3InlineLegend(
      svg,
      [
        { label: "A", color: "#f00", seriesKey: "A" },
        { label: "B", color: "#0f0", seriesKey: "B" },
      ],
      {
        width: 400,
        height: 120,
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
        theme,
        layout: { interactive: true },
      },
    );

    emitSeriesFocus("A");
    const items = container.querySelectorAll<SVGGElement>(".vs-legend-item");
    expect(items[0]?.getAttribute("opacity")).toBe("1");
    expect(items[1]?.getAttribute("opacity")).toBe("0.45");

    cleanup();
    container.remove();
  });

  it("toggles visibility with shift+click handler path", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const svg = d3.select(container).append("svg").attr("width", 400).attr("height", 120);
    const cleanup = layoutD3InlineLegend(
      svg,
      [{ label: "X", color: "#00f", seriesKey: "X" }],
      {
        width: 400,
        height: 120,
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
        theme,
        layout: { interactive: true },
      },
    );

    toggleSeriesVisibility("X");
    const item = container.querySelector<SVGGElement>(".vs-legend-item");
    expect(item?.getAttribute("opacity")).toBe("0.35");
    const text = item?.querySelector("text");
    expect(text?.getAttribute("text-decoration")).toBe("line-through");

    cleanup();
    container.remove();
  });
});
