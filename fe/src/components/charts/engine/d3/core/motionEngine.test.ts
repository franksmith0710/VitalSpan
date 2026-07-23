import { describe, expect, it } from "vitest";
import * as d3 from "d3";
import { morphPath, staggerEnterSelection } from "./motionEngine";
import { setMotionIntensity } from "./chartVisualTokens";

describe("motionEngine L7", () => {
  it("morphPath updates d attribute", () => {
    setMotionIntensity("off");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const svg = d3.select(container).append("svg");
    const path = svg.append("path").attr("d", "M0,0 L10,10");
    morphPath(path, "M0,0 L20,5");
    expect(path.attr("d")).toBe("M0,0 L20,5");
    container.remove();
  });

  it("staggerEnterSelection sets opacity to 1 when motion off", () => {
    setMotionIntensity("off");
    const container = document.createElement("div");
    document.body.appendChild(container);
    const svg = d3.select(container).append("svg");
    const g = svg.selectAll("circle").data([1, 2, 3]).join("circle");
    staggerEnterSelection(g);
    g.each(function () {
      expect(d3.select(this).attr("opacity")).toBe("1");
    });
    setMotionIntensity("standard");
    container.remove();
  });
});
