import { describe, expect, it } from "vitest";
import { hasPositiveOuterGaps } from "../gapRuntimeProbe";
import { compactPixelLayoutForGapChange } from "./gapCompaction";
import type { DashboardLayoutV2 } from "../layoutUtils";

const baseLayout: DashboardLayoutV2 = {
  version: 2,
  canvas: { width: 1440, height: 900 },
  widgets: [],
  globalFilters: [],
};

describe("gapCompaction", () => {
  it("closes coordinate slack when switching md shell gap to none", () => {
    const layout: DashboardLayoutV2 = {
      ...baseLayout,
      widgets: [
        {
          id: "w1",
          type: "chart",
          title: "左",
          order: 0,
          x: 0,
          y: 0,
          width: 400,
          height: 200,
        },
        {
          id: "w2",
          type: "chart",
          title: "右",
          order: 1,
          x: 420,
          y: 0,
          width: 400,
          height: 200,
        },
      ],
    };

    const result = compactPixelLayoutForGapChange(layout, 5, 0);
    expect(result.compacted).toBe(true);
    expect(result.layout.widgets[1]?.x).toBe(400);
    expect(hasPositiveOuterGaps(result.layout.widgets)).toBe(false);
  });

  it("does not move widgets when shell gap increases", () => {
    const layout: DashboardLayoutV2 = {
      ...baseLayout,
      widgets: [
        {
          id: "w1",
          type: "chart",
          title: "左",
          order: 0,
          x: 0,
          y: 0,
          width: 400,
          height: 200,
        },
        {
          id: "w2",
          type: "chart",
          title: "右",
          order: 1,
          x: 400,
          y: 0,
          width: 400,
          height: 200,
        },
      ],
    };

    const result = compactPixelLayoutForGapChange(layout, 0, 5);
    expect(result.compacted).toBe(false);
    expect(result.layout.widgets[1]?.x).toBe(400);
  });

  it("leaves geometry unchanged when outer rects already touch", () => {
    const layout: DashboardLayoutV2 = {
      ...baseLayout,
      widgets: [
        {
          id: "w1",
          type: "chart",
          title: "左",
          order: 0,
          x: 0,
          y: 0,
          width: 400,
          height: 200,
        },
        {
          id: "w2",
          type: "chart",
          title: "右",
          order: 1,
          x: 400,
          y: 0,
          width: 400,
          height: 200,
        },
      ],
    };

    const result = compactPixelLayoutForGapChange(layout, 5, 0);
    expect(result.layout.widgets[1]?.x).toBe(400);
    expect(hasPositiveOuterGaps(result.layout.widgets)).toBe(false);
  });
});
