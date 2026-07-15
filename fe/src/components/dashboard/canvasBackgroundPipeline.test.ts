import { describe, expect, it } from "vitest";
import {
  hasUserCanvasBackground,
  patchDecorPresetStyle,
  resolveArtboardStyle,
  resolveCanvasDecorPresetId,
} from "./dashboardStyleConfig";
import {
  applyDashboardStylePatch,
  bootstrapDashboardStyleConfig,
} from "./dashboardThemeVariants";
import { hydrateDashboardStyle } from "./stylePipeline";

describe("canvas background edit pipeline", () => {
  it("preserves decor patch through patch + hydrate roundtrip", () => {
    const base = bootstrapDashboardStyleConfig({ colorScheme: "light" });
    const patch = patchDecorPresetStyle("dots", base);
    const { styleConfig: patched } = applyDashboardStylePatch(base, [], patch);
    const hydrated = hydrateDashboardStyle(patched);

    expect(hasUserCanvasBackground(hydrated)).toBe(true);
    expect(hydrated.canvasDecorPresetId).toBe("dots");
    expect(resolveArtboardStyle(hydrated).backgroundImage).toContain("url(");
  });

  it("preserves solid color patch through hydrate", () => {
    const base = bootstrapDashboardStyleConfig({ colorScheme: "light" });
    const { styleConfig: patched } = applyDashboardStylePatch(base, [], {
      canvasBackground: "#eff6ff",
      canvasBackgroundCustom: true,
    });
    const hydrated = hydrateDashboardStyle(patched);

    expect(hasUserCanvasBackground(hydrated)).toBe(true);
    expect(resolveArtboardStyle(hydrated).background).toBe("#eff6ff");
  });

  it("dark theme decor remains renderable after hydrate (panel id vs canvas)", () => {
    const base = bootstrapDashboardStyleConfig({ colorScheme: "dark" });
    const patch = patchDecorPresetStyle("dots", base);
    const { styleConfig: patched } = applyDashboardStylePatch(base, [], patch);
    const hydrated = hydrateDashboardStyle(patched);

    expect(resolveCanvasDecorPresetId(patched)).toBe("dots");
    expect(hasUserCanvasBackground(hydrated)).toBe(true);
    expect(resolveArtboardStyle(hydrated).backgroundImage).toContain("url(");
  });

  it("hydrate merges root custom canvas when themeVariants snapshot is stale", () => {
    const base = bootstrapDashboardStyleConfig({ colorScheme: "light" });
    const decor = patchDecorPresetStyle("dots", base);
    const stale = { ...base, ...decor };
    expect(resolveCanvasDecorPresetId(stale)).toBe("dots");

    const hydrated = hydrateDashboardStyle(stale);
    expect(hasUserCanvasBackground(hydrated)).toBe(true);
    expect(resolveArtboardStyle(hydrated).backgroundImage).toContain("url(");
  });
});
