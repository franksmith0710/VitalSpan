import { describe, expect, it } from "vitest";
import { defaultTabsConfig } from "../layoutUtils";
import type { DashboardLayoutV2, PixelLayoutWidget } from "../layoutUtils";
import { layoutsOverlap } from "./collisionLayout";
import { repairPixelLayoutTabState, sanitizePixelLayoutGeometry } from "./layoutSanitize";

function chart(id: string, x: number, y: number, w: number, h: number, order: number): PixelLayoutWidget {
  return { id, type: "chart", title: id, order, x, y, width: w, height: h };
}

function tabsHost(id: string, x: number, y: number, childIds: string[]): PixelLayoutWidget {
  const cfg = defaultTabsConfig(id);
  cfg.panes[0]!.childWidgetIds = childIds;
  return { id, type: "tabs", title: "页签", order: 0, x, y, width: 400, height: 240, tabsConfig: cfg };
}

describe("layoutSanitize", () => {
  it("parks tab children that only appear in childWidgetIds", () => {
    const media = chart("media", 100, 200, 300, 180, 2);
    const layout: DashboardLayoutV2 = {
      version: 2,
      canvas: { width: 1440, height: 900 },
      widgets: [tabsHost("tabs", 80, 120, ["media"]), media],
      globalFilters: [],
    };
    const repaired = repairPixelLayoutTabState(layout);
    const parked = repaired.widgets.find((w) => w.id === "media");
    expect(parked?.parentTabsId).toBe("tabs");
    expect(parked?.width).toBe(0);
    expect(parked?.height).toBe(0);
    expect(layoutsOverlap(repaired, 0)).toBe(false);
  });

  it("packs overlapping top-level widgets on sanitize", () => {
    const layout: DashboardLayoutV2 = {
      version: 2,
      canvas: { width: 1440, height: 900 },
      widgets: [
        chart("a", 0, 0, 400, 300, 0),
        chart("b", 100, 100, 400, 300, 1),
      ],
      globalFilters: [],
    };
    expect(layoutsOverlap(layout, 0)).toBe(true);
    const sanitized = sanitizePixelLayoutGeometry(layout);
    expect(layoutsOverlap(sanitized, 0)).toBe(false);
  });

  it("preserves overlapping widgets on data-screen sanitize", () => {
    const layout: DashboardLayoutV2 = {
      version: 2,
      canvas: { width: 1920, height: 1080 },
      widgets: [
        chart("a", 0, 0, 400, 300, 0),
        chart("b", 100, 100, 400, 300, 1),
      ],
      globalFilters: [],
      styleConfig: { surfaceKind: "data-screen" },
    };
    const sanitized = sanitizePixelLayoutGeometry(layout);
    const b = sanitized.widgets.find((w) => w.id === "b");
    expect(b?.x).toBe(100);
    expect(b?.y).toBe(100);
    expect(layoutsOverlap(sanitized, 0)).toBe(true);
  });
});
