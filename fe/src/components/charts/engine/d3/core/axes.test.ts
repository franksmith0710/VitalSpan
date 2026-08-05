import { describe, expect, it } from "vitest";
import {
  formatAxisCategoryLabel,
  formatHorizontalBandAxisLabel,
  pickCategoryTicks,
  planCategoryAxisLayout,
  resolveBandAxisFontSize,
  resolveCategoryLabelRotate,
  resolveHorizontalCategoryAxisLayout,
  resolveNumericTickCount,
  planNumericAxisTicks,
} from "@/components/charts/engine/d3/core/axes";
import { nearestCategory } from "@/components/charts/engine/d3/core/interaction";
import * as d3 from "d3";

describe("d3 core", () => {
  it("pickCategoryTicks thins labels when viewport is narrow", () => {
    const cats = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const thinned = pickCategoryTicks(cats, 80);
    expect(thinned.length).toBeLessThan(cats.length);
    expect(thinned[0]).toBe("c0");
    expect(thinned[thinned.length - 1]).toBe("c19");
  });

  it("resolveCategoryLabelRotate rotates when slots are tight", () => {
    const ticks = ["一月", "二月", "三月", "四月", "五月", "六月"];
    expect(resolveCategoryLabelRotate(ticks, 180)).toBeLessThan(0);
    expect(resolveCategoryLabelRotate(ticks, 600)).toBe(0);
  });

  it("planCategoryAxisLayout thins ticks and reserves bottom when rotated", () => {
    const cats = Array.from({ length: 16 }, (_, i) => `类目${i + 1}`);
    const layout = planCategoryAxisLayout(cats, 160);
    expect(layout.ticks.length).toBeLessThan(cats.length);
    if (layout.rotateDeg) expect(layout.extraBottom).toBeGreaterThan(0);
  });

  it("formatAxisCategoryLabel hides labels that do not fit in slot", () => {
    expect(formatAxisCategoryLabel("abcdefghijklmnop", 24, 0)).toBe("");
    expect(formatAxisCategoryLabel("短", 48, 0)).toBe("短");
  });

  it("formatAxisCategoryLabel renders multi-dimension composite keys readably", () => {
    expect(formatAxisCategoryLabel("华东\u00012025-01", 80, 0)).toBe("华东 / 2025-01");
  });

  it("planCategoryAxisLayout rotates when composite labels are long", () => {
    const cats = Array.from({ length: 8 }, (_, i) => `产品${i + 1}\u0001类目${i + 1}\u00012025-01-0${i + 1}`);
    const layout = planCategoryAxisLayout(cats, 160);
    expect(layout.rotateDeg).toBeLessThan(0);
  });

  it("formatHorizontalBandAxisLabel hides labels when width is limited", () => {
    expect(formatHorizontalBandAxisLabel("2024年第一季度", 40)).toBe("");
    expect(formatHorizontalBandAxisLabel("短", 80)).toBe("短");
  });

  it("resolveHorizontalCategoryAxisLayout thins ticks and expands left margin", () => {
    const cats = Array.from({ length: 12 }, (_, i) => `2024Q${(i % 4) + 1}`);
    const layout = resolveHorizontalCategoryAxisLayout(cats, 100);
    expect(layout.ticks.length).toBeLessThan(cats.length);
    expect(layout.leftMargin).toBeGreaterThanOrEqual(52);
  });

  it("resolveBandAxisFontSize shrinks but never hides labels", () => {
    expect(resolveBandAxisFontSize(16)).toBe(11);
    expect(resolveBandAxisFontSize(8)).toBeGreaterThanOrEqual(7);
  });

  it("resolveNumericTickCount scales with span without over-thinning", () => {
    expect(resolveNumericTickCount(80)).toBeGreaterThanOrEqual(2);
    expect(resolveNumericTickCount(240)).toBeGreaterThanOrEqual(4);
  });

  it("planNumericAxisTicks thins wide formatted labels on narrow spans", () => {
    const scale = d3.scaleLinear().domain([0, 22_000]).nice();
    const format = (v: d3.NumberValue) => Number(v).toLocaleString("en-US");
    const ticks = planNumericAxisTicks(scale, 284, format);
    expect(ticks.length).toBeLessThanOrEqual(6);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(20_000);
  });

  it("nearestCategory finds closest x", () => {
    const cats = ["a", "b", "c"];
    const x = d3.scalePoint<string>().domain(cats).range([0, 100]).padding(0.5);
    expect(nearestCategory(50, cats, x)).toBe("b");
  });
});
