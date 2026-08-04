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
    expect(container.querySelector(".map-plot-bg")?.getAttribute("fill")).toBe("transparent");

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

  it("applies custom region fill and zoom controls", () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "320px";
    document.body.appendChild(container);

    const dispose = renderD3ChoroplethChart(container, {
      width: 400,
      height: 320,
      rows: [["广东省", 0]],
      columns: ["province", "value"],
      regionField: "province",
      metricField: "value",
      theme: resolveD3Theme("light"),
      showTooltip: false,
      colors: ["#1653a9", "#38bdf8", "#0ea5e9", "#0284c7"],
      geoStyle: {
        regionFillColor: "#f5f5f5",
        showZoomControl: true,
        mapOpacity: 0.5,
      },
    });

    const zeroRegion = Array.from(container.querySelectorAll("path.region")).find((path) => {
      const fill = path.getAttribute("fill") ?? "";
      return fill.toLowerCase() === "#f5f5f5";
    });
    expect(zeroRegion).toBeTruthy();
    expect(container.querySelector('[data-testid="geo-zoom-controls"]')).toBeTruthy();

    dispose();
    document.body.removeChild(container);
  });

  it("mounts bubble ripple layer when bubbleEffect is enabled", () => {
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
      geoStyle: {
        bubbleEffect: true,
        bubbleEffectSpeed: 1.1,
        bubbleEffectRingCount: 4,
      },
    });

    const layer = container.querySelector('[data-testid="geo-map-bubble-layer"]');
    expect(layer).toBeTruthy();
    expect(container.querySelectorAll(".bubble-point").length).toBe(2);
    expect(container.querySelectorAll(".bubble-ring").length).toBeGreaterThan(0);

    dispose();
    document.body.removeChild(container);
  });

  it("applies custom bubble effect color", () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "320px";
    document.body.appendChild(container);

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
      geoStyle: {
        bubbleEffect: true,
        bubbleEffectColor: "#00ff88",
      },
    });

    const core = container.querySelector(".bubble-core");
    expect(core?.getAttribute("fill")).toBe("#00ff88");
    const ring = container.querySelector(".bubble-ring");
    expect(ring?.getAttribute("stroke")).toBe("#00ff88");

    dispose();
    document.body.removeChild(container);
  });

  it("applies region label color and font size", () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "320px";
    document.body.appendChild(container);

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
      geoStyle: {
        showRegionLabel: true,
        regionLabelColor: "#ff0000",
        regionLabelFontSize: 14,
      },
    });

    const label = container.querySelector("text.region-label");
    expect(label?.getAttribute("fill")).toBe("#ff0000");
    expect(label?.style.fontSize).toBe("14px");

    dispose();
    document.body.removeChild(container);
  });
});
