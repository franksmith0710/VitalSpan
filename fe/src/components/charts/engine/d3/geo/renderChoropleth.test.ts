import { describe, expect, it, vi } from "vitest";
import { renderD3ChoroplethChart } from "@/components/charts/engine/d3/geo/renderChoropleth";
import { resolveD3Theme } from "@/components/charts/engine/d3/core/themeEngine";

describe("renderD3ChoroplethChart", () => {
  it("renders province paths with non-empty geometry", () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "320px";
    document.body.appendChild(container);

    const dispose = renderD3ChoroplethChart(container, {
      width: 400,
      height: 320,
      rows: [
        ["广东省", 320],
        ["浙江省", 280],
      ],
      columns: ["province", "value"],
      regionField: "province",
      metricField: "value",
      theme: resolveD3Theme("light"),
      showTooltip: false,
      colors: ["#1653a9"],
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    const paths = container.querySelectorAll("path.region");
    expect(paths.length).toBe(34);
    expect(svg?.getAttribute("data-region-count")).toBe("34");
    const withGeometry = Array.from(paths).filter((p) => (p.getAttribute("d") ?? "").length > 8);
    expect(withGeometry.length).toBeGreaterThan(20);
    const beijing = Array.from(paths).find((p) => (p.getAttribute("d") ?? "").includes("M"));
    expect(beijing?.getAttribute("stroke")).toBeTruthy();

    dispose();
    document.body.removeChild(container);
  });

  it("renders province strokes at dashboard widget size", () => {
    const container = document.createElement("motion.div");
    document.body.appendChild(container);

    const dispose = renderD3ChoroplethChart(container, {
      width: 469,
      height: 599,
      rows: [["广东省", 320]],
      columns: ["province", "value"],
      regionField: "province",
      metricField: "value",
      theme: resolveD3Theme("light"),
      showTooltip: false,
      colors: ["#1653a9"],
    });

    const regions = container.querySelectorAll("path.region");
    expect(regions.length).toBe(34);
    expect(regions[0]?.getAttribute("d")?.length ?? 0).toBeGreaterThan(8);
    expect(regions[0]?.getAttribute("stroke-width")).toBeTruthy();

    dispose();
    document.body.removeChild(container);
  });

  it("renders outline even when rows are empty", () => {
    const container = document.createElement("motion.div");
    document.body.appendChild(container);

    const dispose = renderD3ChoroplethChart(container, {
      width: 516,
      height: 599,
      rows: [],
      columns: ["province", "value"],
      regionField: "province",
      metricField: "value",
      theme: resolveD3Theme("light"),
      showTooltip: false,
      colors: ["#1653a9"],
    });

    const paths = container.querySelectorAll("path.region");
    expect(paths.length).toBe(34);
    expect(container.querySelector("svg")?.getAttribute("data-region-count")).toBe("34");

    dispose();
    document.body.removeChild(container);
  });

  it("drills on double-click instead of single click", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onPointClick = vi.fn();

    const dispose = renderD3ChoroplethChart(container, {
      width: 400,
      height: 320,
      rows: [["广东省", 320]],
      columns: ["province", "value"],
      regionField: "province",
      metricField: "value",
      theme: resolveD3Theme("light"),
      showTooltip: false,
      colors: ["#1653a9"],
      onPointClick,
    });

    const region = container.querySelector("path.region");
    expect(region).toBeTruthy();
    region?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onPointClick).not.toHaveBeenCalled();
    region?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(onPointClick).toHaveBeenCalledTimes(1);

    dispose();
    document.body.removeChild(container);
  });
});
