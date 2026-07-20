import { describe, expect, it } from "vitest";
import { buildDefaultLayoutForSurface } from "@/lib/surfacePreset";
import { insertPixelPaletteWidget } from "./pixelCanvas/createPixelWidget";
import { persistDashboardLayout, hydrateDashboardStyle } from "./stylePipeline";

describe("data-screen persist bounds", () => {
  it("keeps fixed canvas height when widgets extend below 1080", () => {
    let layout = buildDefaultLayoutForSurface("data-screen");
    layout = insertPixelPaletteWidget("gauge", layout);
    layout = insertPixelPaletteWidget("line", layout);
    const widgets = layout.widgets.map((w) => ({ ...w, y: 900 }));
    layout = { ...layout, widgets };
    const style = hydrateDashboardStyle(layout.styleConfig);
    const saved = persistDashboardLayout(layout, style);
    expect(saved.canvas.height).toBe(1080);
    for (const w of saved.widgets) {
      expect(w.y + w.height).toBeLessThanOrEqual(saved.canvas.height);
      expect(w.x + w.width).toBeLessThanOrEqual(saved.canvas.width);
    }
  });

  it("does not shrink canvas below 1080 when widgets are shorter", () => {
    let layout = buildDefaultLayoutForSurface("data-screen");
    layout = insertPixelPaletteWidget("gauge", layout);
    layout = insertPixelPaletteWidget("line", layout);
    const widgets = layout.widgets.map((w, i) => ({
      ...w,
      x: i === 0 ? 0 : 804,
      y: 0,
      width: i === 0 ? 804 : 768,
      height: 583,
    }));
    layout = { ...layout, widgets };
    const style = hydrateDashboardStyle(layout.styleConfig);
    const saved = persistDashboardLayout(layout, style);
    expect(saved.canvas.height).toBeGreaterThanOrEqual(1080);
    for (const w of saved.widgets) {
      expect(w.y + w.height).toBeLessThanOrEqual(saved.canvas.height);
    }
  });

  it("default insert positions stay within canvas height", () => {
    let layout = buildDefaultLayoutForSurface("data-screen");
    layout = insertPixelPaletteWidget("gauge", layout);
    layout = insertPixelPaletteWidget("line", layout);
    const style = hydrateDashboardStyle(layout.styleConfig);
    const saved = persistDashboardLayout(layout, style);
    expect(saved.canvas.height).toBeGreaterThanOrEqual(1080);
    for (const w of saved.widgets) {
      expect(w.y + w.height).toBeLessThanOrEqual(saved.canvas.height);
    }
  });
});
