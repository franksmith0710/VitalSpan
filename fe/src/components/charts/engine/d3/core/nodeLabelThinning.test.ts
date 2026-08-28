import { describe, expect, it } from "vitest";
import {
  pickGraphVisibleLabelIds,
  pickSankeyVisibleLabelIds,
  pickTreemapVisibleLabelKeys,
  pickVerticalStackIndicesWithoutOverlap,
  verticalLabelBandHeight,
} from "@/components/charts/engine/d3/core/nodeLabelThinning";
import { anyBoxesOverlap } from "@/components/charts/engine/d3/core/labelOverlap";

describe("nodeLabelThinning", () => {
  it("thins dense vertical stacks without overlap", () => {
    const count = 24;
    const fontSize = 11;
    const indices = pickVerticalStackIndicesWithoutOverlap(
      count,
      (index) => index * 6,
      (index) => `2025-06-${String(index + 1).padStart(2, "0")}`,
      fontSize,
    );
    expect(indices.length).toBeLessThan(count);
    const half = verticalLabelBandHeight(fontSize) / 2;
    const boxes = indices.map((index) => {
      const y = index * 6;
      return { left: 0, right: 80, top: y - half, bottom: y + half };
    });
    expect(anyBoxesOverlap(boxes)).toBe(false);
  });

  it("thins dense sankey columns independently", () => {
    const nodes = Array.from({ length: 20 }, (_, index) => ({
      id: `2025-06-${String(index + 1).padStart(2, "0")}`,
      depth: 1,
      y: index * 7,
      height: 4,
    }));
    const visible = pickSankeyVisibleLabelIds(nodes, 10);
    expect(visible.size).toBeGreaterThan(0);
    expect(visible.size).toBeLessThan(nodes.length);
  });

  it("thins crowded treemap labels by cell area priority", () => {
    const leaves = [
      { data: { name: "big" }, x0: 0, y0: 0, x1: 180, y1: 120, value: 80 },
      ...Array.from({ length: 12 }, (_, index) => ({
        data: { name: `small-${index}` },
        x0: 180 + index * 10,
        y0: 0,
        x1: 190 + index * 10,
        y1: 18,
        value: 2,
      })),
    ];
    const visible = pickTreemapVisibleLabelKeys({
      leaves,
      fontSize: 12,
      labelLinesFor: (leaf) => [leaf.data.name, "1,234", "12.3%"],
    });
    expect(visible.has("big")).toBe(true);
    expect(visible.size).toBeLessThan(leaves.length);
  });

  it("thins bipartite graph columns vertically", () => {
    const leftIds = new Set(Array.from({ length: 18 }, (_, index) => `left-${index}`));
    const rightIds = new Set(["right-a", "right-b", "right-c", "right-d"]);
    const nodes = [
      ...[...leftIds].map((id, index) => ({
        id,
        label: `2025-06-${String(index + 1).padStart(2, "0")}`,
        x: 40,
        y: 20 + index * 8,
      })),
      ...[...rightIds].map((id, index) => ({
        id,
        label: `渠道-${index}`,
        x: 280,
        y: 40 + index * 48,
      })),
    ];
    const visible = pickGraphVisibleLabelIds({
      nodes,
      fontSize: 11,
      nodeRadius: () => 6,
      nodeDegree: new Map(nodes.map((node) => [node.id, 1])),
      leftIds,
      rightIds,
    });
    const leftVisible = [...visible].filter((id) => leftIds.has(id));
    expect(leftVisible.length).toBeGreaterThan(0);
    expect(leftVisible.length).toBeLessThan(leftIds.size);
    expect([...visible].filter((id) => rightIds.has(id)).length).toBe(rightIds.size);
  });
});
