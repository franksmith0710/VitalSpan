import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import { setChartAnimationSuppressed } from "@/components/charts/engine/d3/core/animate";
import {
  paintVerticalBar,
  resolveEffectiveDepth,
  setDepthVisual,
  shadeColor,
} from "./depthEngine";

describe("shadeColor", () => {
  it("returns rgb for hex base colors", () => {
    expect(shadeColor("#808080", "top")).toMatch(/^rgb\(/);
    expect(shadeColor("#808080", "side")).toMatch(/^rgb\(/);
    expect(shadeColor("#808080", "shadow")).toMatch(/^rgb\(/);
  });

  it("returns original color for non-hex input", () => {
    expect(shadeColor("rgb(128,128,128)", "top")).toBe("rgb(128,128,128)");
  });
});

describe("resolveEffectiveDepth", () => {
  it("honors explicit off even when global depth is enhanced", () => {
    setDepthVisual("enhanced");
    expect(resolveEffectiveDepth("off")).toBe("off");
    setDepthVisual("off");
  });

  it("does not disable depth when chart animation is suppressed", () => {
    setDepthVisual("standard");
    setChartAnimationSuppressed(true);
    expect(resolveEffectiveDepth()).toBe("standard");
    setChartAnimationSuppressed(false);
    setDepthVisual("off");
  });
});

describe("paintVerticalBar", () => {
  it("does not throw when depth is off", () => {
    const host = document.createElement("div");
    const svg = d3.select(host).append("svg");
    const plot = svg.append("g");
    expect(() =>
      paintVerticalBar({
        plot,
        x: 0,
        y1: 10,
        height: 24,
        width: 12,
        color: "#465fff",
        depthLevel: "off",
        animate: false,
      }),
    ).not.toThrow();
  });
});
