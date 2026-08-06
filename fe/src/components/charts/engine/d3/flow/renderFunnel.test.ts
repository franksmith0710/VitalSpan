import { describe, expect, it } from "vitest";
import { renderD3FunnelChart } from "./renderFunnel";
import { getAntvThemeTokens } from "@/components/charts/engine/antv/theme";

describe("renderD3FunnelChart", () => {
  it("does not reserve legend space when legend is disabled for thumbnail previews", () => {
    const data = [
      { stage: "A", number: 100 },
      { stage: "B", number: 80 },
      { stage: "C", number: 60 },
      { stage: "D", number: 40 },
    ];

    const container = document.createElement("div");
    const cleanup = renderD3FunnelChart(container, {
      width: 120,
      height: 96,
      colors: ["#465fff", "#12b76a", "#f79009"],
      theme: getAntvThemeTokens("light"),
      showLabel: false,
      showTooltip: false,
      showLegend: false,
      labelFontSize: 6,
      options: { data },
    });

    expect(container.querySelector("g.vs-legend")).toBeNull();
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0);
    cleanup();
  });
});
