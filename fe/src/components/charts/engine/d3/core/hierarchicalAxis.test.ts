import { describe, expect, it } from "vitest";
import { CARTESIAN_CATEGORY_KEY_SEP, formatCategoryCellValue } from "@/components/charts/engine/buildDatasetEncoding";
import {
  buildCategoryLevelSegments,
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

  it("resolveHierarchicalAxisLayout reserves bottom space per level", () => {
    expect(resolveHierarchicalAxisLayout(3).extraBottom).toBeGreaterThan(resolveHierarchicalAxisLayout(1).extraBottom);
  });
});
