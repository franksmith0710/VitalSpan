import { describe, expect, it } from "vitest";
import type { DashboardLayoutV1, DashboardLayoutV2 } from "./layoutUtils";
import {
  isPixelCanvasEnabled,
  migrateDashboardLayoutV1,
  prepareDashboardLayout,
} from "./dashboardCanvasMode";

const v1: DashboardLayoutV1 = {
  version: 1,
  widgets: [
    {
      id: "w1",
      type: "chart",
      title: "图表",
      order: 0,
      colSpan: 6,
      rowSpan: 2,
      gridX: 2,
      gridY: 3,
    },
  ],
  globalFilters: [{ id: "f1" }],
  styleConfig: { widgetGap: 8 },
};

const v2: DashboardLayoutV2 = {
  version: 2,
  canvas: { width: 1440, height: 900 },
  widgets: [
    {
      id: "w1",
      type: "chart",
      title: "图表",
      order: 0,
      x: 120,
      y: 100,
      width: 480,
      height: 320,
    },
  ],
  globalFilters: [],
};

describe("dashboard canvas mode", () => {
  it("默认开启且仅显式 false 关闭像素画布", () => {
    expect(isPixelCanvasEnabled(undefined)).toBe(true);
    expect(isPixelCanvasEnabled("")).toBe(true);
    expect(isPixelCanvasEnabled("0")).toBe(true);
    expect(isPixelCanvasEnabled("false")).toBe(false);
  });

  it.each([
    [true, v1, "pixel", true, 2],
    [true, v2, "pixel", true, 2],
    [false, v1, "grid", true, 1],
    [false, v2, "pixel-readonly", false, 2],
  ] as const)(
    "按 flag/layout 选择四象限编辑策略",
    (enabled, source, editor, canSave, version) => {
      const result = prepareDashboardLayout(source, enabled);
      expect(result.editor).toBe(editor);
      expect(result.canSave).toBe(canSave);
      expect(result.layout.version).toBe(version);
    },
  );

  it("v1 内存迁移保持配置并使用与后端一致的确定性像素几何", () => {
    const migrated = migrateDashboardLayoutV1(v1);
    expect(migrated).toMatchObject({
      version: 2,
      canvas: { width: 1440, height: 900 },
      globalFilters: [{ id: "f1" }],
      styleConfig: { widgetGap: 8 },
      widgets: [
        {
          id: "w1",
          x: 240,
          y: 132,
          width: 720,
          height: 76,
        },
      ],
    });
    expect(migrated.widgets[0]).not.toHaveProperty("colSpan");
  });
});
