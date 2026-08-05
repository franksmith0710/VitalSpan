import { describe, expect, it } from "vitest";
import {
  formatPieSliceLabel,
  formatPieTooltipValue,
  layoutPieOutsideLabels,
  outsideLabelRowGap,
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

  it("builds radial geometry for right-side labels", () => {
    const geo = pieOutsideLabelGeometry(Math.PI / 2, 80, 11);
    expect(geo.anchor).toBe("start");
    expect(geo.textX).toBeGreaterThan(80);
  });

  it("anchors leader line at per-slice outer radius (rose chart)", () => {
    const outerR = 80;
    const geoFull = pieOutsideLabelGeometry(Math.PI / 2, outerR, 11, outerR);
    const geoSmall = pieOutsideLabelGeometry(Math.PI / 2, outerR, 11, 24);
    expect(geoSmall.x0).toBe(24);
    expect(geoFull.x0).toBe(80);
    expect(geoSmall.x0).toBeLessThan(geoFull.x0);
  });

  it("formats tooltip value with percent", () => {
    const text = formatPieTooltipValue(628, 10000, { type: "auto", thousandSeparator: true }, 2);
    expect(text).toContain("628");
    expect(text).toMatch(/\(6\.28%\)/);
  });

  it("distributes labels radially around the circle", () => {
    const outerR = 80;
    const candidates = [
      { key: "a", midAngle: 0.3, sliceAngle: 0.2, text: "A" },
      { key: "b", midAngle: 1.2, sliceAngle: 0.2, text: "B" },
      { key: "c", midAngle: 2.4, sliceAngle: 0.2, text: "C" },
    ];
    const placed = layoutPieOutsideLabels(
      candidates,
      outerR,
      11,
      pieOutsideLabelBounds(outerR),
    );
    const positions = candidates
      .map((c) => placed.get(c.key))
      .filter((p) => p?.visible)
      .map((p) => ({ x: p!.textX, y: p!.textY }));
    expect(positions.length).toBe(3);
    const ys = new Set(positions.map((p) => p.y));
    expect(ys.size).toBeGreaterThan(1);
  });

  it("keeps more labels for rose-like equal-angle slices via overlap nudging", () => {
    const outerR = 60;
    const sliceAngle = 2 * Math.PI / 35;
    const candidates = Array.from({ length: 35 }, (_, i) => ({
      key: pieArcLayoutKey(sliceAngle * i, sliceAngle * (i + 1)),
      midAngle: sliceAngle * i + sliceAngle / 2,
      sliceAngle,
      text: `2025-01-${String(i + 1).padStart(2, "0")} 1,000 (1%)`,
      priority: 1000 + i,
    }));
    const placed = layoutPieOutsideLabels(candidates, outerR, 11, { ymin: -80, ymax: 80 });
    const visible = candidates.filter((c) => placed.get(c.key)?.visible).length;
    expect(visible).toBeGreaterThan(5);
    expect(visible).toBeLessThan(candidates.length);
  });

  it("prefers higher priority when labels still overlap after nudging", () => {
    const outerR = 50;
    const candidates = [
      {
        key: "low",
        midAngle: 0.5,
        sliceAngle: 0.15,
        text: "小扇区 100 (1%)",
        priority: 100,
      },
      {
        key: "high",
        midAngle: 0.55,
        sliceAngle: 0.15,
        text: "大扇区 9,999 (90%)",
        priority: 9999,
      },
    ];
    const placed = layoutPieOutsideLabels(candidates, outerR, 11, { ymin: -60, ymax: 60 });
    expect(placed.get("high")?.visible).toBe(true);
  });

  it("keeps leader elbows on radial spokes (no tangential bend)", () => {
    const outerR = 80;
    const connectR = 24;
    const midAngle = 2.1;
    const geo = pieOutsideLabelGeometry(midAngle, outerR, 11, connectR, "标签");
    const cross = geo.x1 * geo.y0 - geo.y1 * geo.x0;
    expect(Math.abs(cross)).toBeLessThan(0.01);
  });
});
