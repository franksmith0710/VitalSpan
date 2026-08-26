import { afterEach, describe, expect, it } from "vitest";
import { renderD3ForceGraph } from "@/components/charts/engine/d3/graph/renderForceGraph";
import {
  buildGraphLayoutStateKey,
  readForceGraphLayoutState,
  resetForceGraphLayoutStateForTests,
} from "@/components/charts/engine/d3/graph/forceGraphLayoutState";
import { resolveD3Theme } from "@/components/charts/engine/d3/core/themeEngine";

const baseConfig = {
  width: 480,
  height: 360,
  colors: ["#465fff", "#22c55e", "#f59e0b"],
  theme: resolveD3Theme("dark"),
  showLabel: true,
  showTooltip: false,
  showLegend: false,
  labelFontSize: 12,
  options: {
    nodes: [
      { id: "电话销售", data: { label: "电话销售" } },
      { id: "线下门店", data: { label: "线下门店" } },
      { id: "2025-06-04", data: { label: "2025-06-04" } },
    ],
    edges: [
      { source: "电话销售", target: "2025-06-04" },
      { source: "线下门店", target: "2025-06-04" },
      { source: "电话销售", target: "2025-06-04" },
    ],
    layout: { type: "force" },
  },
  instanceKey: "force-graph-test",
};

describe("renderD3ForceGraph", () => {
  afterEach(() => {
    resetForceGraphLayoutStateForTests();
  });

  it("renders graph nodes", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = renderD3ForceGraph(container, baseConfig);
    expect(container.querySelectorAll("g.node").length).toBe(3);

    dispose();
    document.body.removeChild(container);
  });

  it("persists settled layout on dispose", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const dispose = renderD3ForceGraph(container, baseConfig);
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 120);
    });

    const first = container.querySelector("g.node")?.getAttribute("transform");
    expect(first).toBeTruthy();

    dispose();
    const layoutKey = `${buildGraphLayoutStateKey(
      "force-graph-test",
      ["电话销售", "线下门店", "2025-06-04"],
      [
        { source: "电话销售", target: "2025-06-04" },
        { source: "线下门店", target: "2025-06-04" },
      ],
      "force",
    )}|structured-v3`;
    expect(readForceGraphLayoutState(layoutKey)?.["电话销售"]).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      fx: expect.any(Number),
      fy: expect.any(Number),
    });

    document.body.removeChild(container);
  });
});
