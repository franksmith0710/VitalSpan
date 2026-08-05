import { describe, expect, it } from "vitest";
import {
  formatPieSliceLabel,
  formatPieTooltipValue,
  layoutPieOutsideLabels,
  pieArcLayoutKey,
  pieOutsideLabelBounds,
  pieOutsideLabelGeometry,
  resolvePieLabelRenderOptions,
} from "./pieLabels";

describe("pieLabels", () => {
  it("defaults to inside + indicator only", () => {
    expect(resolvePieLabelRenderOptions(undefined)).toEqual({
      position: "inside",
      showDimension: false,
      showIndicator: true,
      showPercent: false,
      percentDecimals: 2,
    });
  });

  it("defaults to dimension + indicator + percent when outside", () => {
    expect(resolvePieLabelRenderOptions({ position: "outside" })).toEqual({
      position: "outside",
      showDimension: true,
      showIndicator: true,
      showPercent: true,
      percentDecimals: 2,
    });
  });

  it("formats dimension, indicator and percent for outside labels", () => {
    const opts = resolvePieLabelRenderOptions({ position: "outside" });
    const text = formatPieSliceLabel(
      { type: "华东", value: 25 },
      "type",
      "value",
      100,
      opts,
      { type: "auto", thousandSeparator: true },
    );
    expect(text).toContain("华东");
    expect(text).toContain("25");
    expect(text).toContain("25.00%");
    expect(text).toMatch(/华东.*25.*\(25\.00%\)/);
  });

  it("builds elbow geometry for right-side labels", () => {
    const geo = pieOutsideLabelGeometry(Math.PI / 2, 80);
    expect(geo.anchor).toBe("start");
    expect(geo.textX).toBeGreaterThan(80);
  });

  it("formats tooltip value with percent", () => {
    const text = formatPieTooltipValue(628, 10000, { type: "auto", thousandSeparator: true }, 2);
    expect(text).toContain("628");
    expect(text).toMatch(/\(6\.28%\)/);
  });

  it("aligns right-side labels to a shared column", () => {
    const outerR = 80;
    const candidates = [
      { key: "a", midAngle: 0.3, sliceAngle: 0.1, text: "A" },
      { key: "b", midAngle: 0.5, sliceAngle: 0.1, text: "B" },
      { key: "c", midAngle: 0.7, sliceAngle: 0.1, text: "C" },
    ];
    const placed = layoutPieOutsideLabels(
      candidates,
      outerR,
      11,
      pieOutsideLabelBounds(outerR),
    );
    const textXs = candidates
      .map((c) => placed.get(c.key)?.textX)
      .filter((x): x is number => x != null);
    expect(new Set(textXs).size).toBe(1);
  });

  it("separates stacked outside labels on the same side", () => {
    const outerR = 80;
    const bounds = pieOutsideLabelBounds(outerR);
    const fontSize = 11;
    const gap = Math.max(fontSize * 1.15, 12);
    const angles = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45];
    const candidates = angles.map((midAngle, i) => ({
      key: pieArcLayoutKey(midAngle, midAngle + 0.08),
      midAngle,
      sliceAngle: 0.08,
      text: `省${i}`,
    }));
    const placed = layoutPieOutsideLabels(candidates, outerR, fontSize, bounds);
    const rightYs = candidates
      .map((c) => placed.get(c.key))
      .filter((p) => p?.visible && p.textY > 0)
      .map((p) => p!.textY)
      .sort((a, b) => a - b);
    for (let i = 1; i < rightYs.length; i++) {
      expect(rightYs[i] - rightYs[i - 1]).toBeGreaterThanOrEqual(gap - 0.01);
    }
  });
});
