import { describe, expect, it } from "vitest";
import {
  estimateV1GridCanvasHeight,
  resolveTemplateGridFitScale,
} from "./templateGridFitScale";

describe("templateGridFitScale", () => {
  it("estimates grid canvas height from row spans", () => {
    const height = estimateV1GridCanvasHeight([
      {
        id: "kpi",
        type: "chart",
        title: "KPI",
        order: 0,
        colSpan: 12,
        rowSpan: 1,
        gridY: 0,
      },
      {
        id: "chart",
        type: "chart",
        title: "Chart",
        order: 1,
        colSpan: 6,
        rowSpan: 5,
        gridY: 1,
      },
    ]);
    expect(height).toBe(6 * 32 + 5 * 12);
  });

  it("scales down when content exceeds host height", () => {
    expect(resolveTemplateGridFitScale(120, 240)).toBe(0.5);
    expect(resolveTemplateGridFitScale(300, 240)).toBe(1);
  });
});
