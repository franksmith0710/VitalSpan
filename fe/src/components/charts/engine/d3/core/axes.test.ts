import { describe, expect, it } from "vitest";
import {
  formatAxisCategoryLabel,
  formatHorizontalBandAxisLabel,
  estimateCategoryBandCenterPx,
  pickCategoryTickIndices,
  pickCategoryTickIndicesByPixel,
  pickCategoryTickIndicesForLabels,
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
  it("pickCategoryTickIndices spaces ticks evenly across span", () => {
    const indices = pickCategoryTickIndices(24, 480, 72);
    expect(indices[0]).toBe(0);
    expect(indices[indices.length - 1]).toBe(23);
    expect(indices.length).toBeGreaterThan(2);
    const gaps = indices.slice(1).map((value, i) => value - indices[i]!);
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    gaps.forEach((gap) => expect(gap).toBeGreaterThanOrEqual(Math.floor(avgGap * 0.6)));
  });

  it("pickCategoryTickIndicesByPixel spreads ticks on band centers", () => {
    const count = 40;
    const innerW = 800;
    const step = innerW / count;
    const bw = step * 0.8;
    const indexToPx = (i: number) => estimateCategoryBandCenterPx(i, count, innerW, bw);
    const indices = pickCategoryTickIndicesByPixel(count, innerW, 56, indexToPx);
    const positions = indices.map(indexToPx);
    expect(positions[0]).toBeLessThan(innerW * 0.15);
    expect(positions[positions.length - 1]).toBeGreaterThan(innerW * 0.85);
    const gaps = positions.slice(1).map((p, i) => p - positions[i]!);
    const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    gaps.forEach((gap) => expect(gap).toBeGreaterThan(avgGap * 0.35));
  });

  it("pickCategoryTicks thins labels when viewport is narrow", () => {
    const cats = Array.from({ length: 20 }, (_, i) => `c${i}`);
    const thinned = pickCategoryTicks(cats, 80);
    expect(thinned.length).toBeLessThan(cats.length);
    expect(thinned[0]).toBe("c0");
    expect(thinned[thinned.length - 1]).toBe("c19");
  });

  it("pickCategoryTickIndicesForLabels keeps endpoints and spans band centers", () => {
    const provinces = [
      "云南省",
      "河北省",
      "江苏省",
      "广东省",
      "北京市",
      "上海市",
      "山东省",
      "浙江省",
      "四川省",
      "湖北省",
      "河南省",
      "湖南省",
      "福建省",
      "安徽省",
      "江西省",
      "辽宁省",
      "黑龙江省",
      "吉林省",
      "陕西省",
      "甘肃省",
      "贵州省",
      "海南省",
      "天津市",
      "重庆市",
      "广西壮族自治区",
    ];
    const innerW = 900;
    const count = provinces.length;
    const bw = innerW / count * 0.8;
    const toPx = (i: number) => estimateCategoryBandCenterPx(i, count, innerW, bw);
    const indices = pickCategoryTickIndicesForLabels(
      provinces,
      innerW,
      (c) => String(c),
      48,
      -45,
      toPx,
    );
    expect(indices).toContain(0);
    expect(indices).toContain(count - 1);
    const positions = indices.map(toPx);
    expect(positions[positions.length - 1]).toBeGreaterThan(innerW * 0.85);
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
