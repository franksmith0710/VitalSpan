import { describe, expect, it } from "vitest";
import { CARTESIAN_CATEGORY_KEY_SEP, formatCategoryCellValue, sortCompositeCategoryKeys } from "@/components/charts/engine/buildDatasetEncoding";
import {
  buildCategoryLevelSegments,
  pickCategoryBoundaryIndices,
  planHierarchicalCategoryAxis,
  resolveActiveCategoryLevels,
  resolveFinestLevelForThinning,
  resolveHierarchicalAxisLayout,
  splitCompositeCategoryParts,
} from "@/components/charts/engine/d3/core/hierarchicalAxis";

describe("hierarchical category axis", () => {
  const categories = [
    `云南省${CARTESIAN_CATEGORY_KEY_SEP}2025-01${CARTESIAN_CATEGORY_KEY_SEP}销量`,
    `云南省${CARTESIAN_CATEGORY_KEY_SEP}2025-02${CARTESIAN_CATEGORY_KEY_SEP}销量`,
    `江苏省${CARTESIAN_CATEGORY_KEY_SEP}2025-01${CARTESIAN_CATEGORY_KEY_SEP}销量`,
  ];

  it("formatCategoryCellValue suppresses null literals", () => {
    expect(formatCategoryCellValue(null)).toBe("");
    expect(formatCategoryCellValue("null")).toBe("");
    expect(formatCategoryCellValue("华东")).toBe("华东");
  });

  it("splitCompositeCategoryParts preserves dimension order", () => {
    expect(splitCompositeCategoryParts(categories[0]!, 3)).toEqual(["云南省", "2025-01", "销量"]);
  });

  it("buildCategoryLevelSegments merges consecutive level-0 labels", () => {
    const level0 = buildCategoryLevelSegments(categories, 0, 3);
    expect(level0).toEqual([
      { start: 0, end: 1, label: "云南省" },
      { start: 2, end: 2, label: "江苏省" },
    ]);
  });

  it("buildCategoryLevelSegments splits level-1 within region groups", () => {
    const level1 = buildCategoryLevelSegments(categories, 1, 3);
    expect(level1).toEqual([
      { start: 0, end: 0, label: "2025-01" },
      { start: 1, end: 1, label: "2025-02" },
      { start: 2, end: 2, label: "2025-01" },
    ]);
  });

  it("resolveActiveCategoryLevels skips all-empty dimension rows", () => {
    const sparse = [
      `云南省${CARTESIAN_CATEGORY_KEY_SEP}null${CARTESIAN_CATEGORY_KEY_SEP}null`,
      `江苏省${CARTESIAN_CATEGORY_KEY_SEP}null${CARTESIAN_CATEGORY_KEY_SEP}null`,
    ];
    expect(resolveActiveCategoryLevels(sparse, 3)).toEqual([0]);
  });

  it("resolveFinestLevelForThinning picks finest structural level", () => {
    const productCategory = [
      `无线鼠标${CARTESIAN_CATEGORY_KEY_SEP}外设配件`,
      `机械键盘${CARTESIAN_CATEGORY_KEY_SEP}外设配件`,
      `27寸显示器${CARTESIAN_CATEGORY_KEY_SEP}显示设备`,
    ];
    const active = resolveActiveCategoryLevels(productCategory, 2);
    expect(resolveFinestLevelForThinning(active)).toBe(1);
  });

  it("planHierarchicalCategoryAxis returns null when only one active level", () => {
    const sparse = [
      `云南省${CARTESIAN_CATEGORY_KEY_SEP}null`,
      `江苏省${CARTESIAN_CATEGORY_KEY_SEP}null`,
    ];
    expect(planHierarchicalCategoryAxis(sparse, 480)).toBeNull();
  });

  it("planHierarchicalCategoryAxis thins finest-level ticks when categories are dense", () => {
    const dense = Array.from({ length: 24 }, (_, i) =>
      `产品${i}${CARTESIAN_CATEGORY_KEY_SEP}类目${Math.floor(i / 4)}`,
    );
    const plan = planHierarchicalCategoryAxis(dense, 320);
    expect(plan).not.toBeNull();
    expect(plan!.visibleCategories.length).toBeLessThan(dense.length);
    expect(plan!.activeLevels.length).toBe(2);
  });

  it("pickCategoryBoundaryIndices marks coarse-level group starts", () => {
    const keys = [
      `企业直销${CARTESIAN_CATEGORY_KEY_SEP}2025-01-01`,
      `企业直销${CARTESIAN_CATEGORY_KEY_SEP}2025-01-02`,
      `电商平台${CARTESIAN_CATEGORY_KEY_SEP}2025-01-03`,
    ];
    expect(pickCategoryBoundaryIndices(keys, 0, 2)).toEqual([0, 2]);
  });

  it("planHierarchicalCategoryAxis keeps coarse boundaries in visible ticks", () => {
    const keys = Array.from({ length: 12 }, (_, i) =>
      `${i < 6 ? "企业直销" : "电商平台"}${CARTESIAN_CATEGORY_KEY_SEP}2025-01-${String((i % 6) + 1).padStart(2, "0")}`,
    );
    const plan = planHierarchicalCategoryAxis(keys, 480);
    expect(plan).not.toBeNull();
    expect(plan!.visibleCategories.some((c) => c.startsWith("电商平台"))).toBe(true);
  });

  it("resolveHierarchicalAxisLayout reserves bottom space per active level", () => {
    expect(resolveHierarchicalAxisLayout(3).extraBottom).toBeGreaterThan(resolveHierarchicalAxisLayout(1).extraBottom);
  });

  it("planHierarchicalCategoryAxis shows four active levels when data is sorted by hierarchy", () => {
    const SEP = CARTESIAN_CATEGORY_KEY_SEP;
    const unsorted = [
      `2025-07-08${SEP}甘肃省${SEP}无线鼠标${SEP}外设配件`,
      `2025-05-22${SEP}江苏省${SEP}机械键盘${SEP}显示设备`,
      `2025-05-22${SEP}甘肃省${SEP}无线鼠标${SEP}外设配件`,
      `2025-07-08${SEP}江苏省${SEP}机械键盘${SEP}外设配件`,
      `2025-05-22${SEP}甘肃省${SEP}机械键盘${SEP}显示设备`,
      `2025-07-08${SEP}甘肃省${SEP}机械键盘${SEP}外设配件`,
    ];
    const plan = planHierarchicalCategoryAxis(unsorted, 640, { structuralLevelCount: 4 });
    expect(plan).not.toBeNull();
    expect(plan!.activeLevels).toEqual([0, 1, 2, 3]);
    expect(plan!.structuralLevelCount).toBe(4);
    const dateSegments = buildCategoryLevelSegments(
      sortCompositeCategoryKeys(unsorted, 4),
      0,
      4,
    );
    expect(dateSegments.some((segment) => segment.end > segment.start)).toBe(true);
  });
});
