import { describe, expect, it } from "vitest";
import {
  hasUserCanvasBackground,
  materializeDecorStyleConfig,
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

  it("dark theme custom purple survives hydrate", () => {
    const base = bootstrapDashboardStyleConfig({ colorScheme: "dark" });
    const { styleConfig: patched } = applyDashboardStylePatch(base, [], {
      canvasBackground: "#7556b8",
      canvasBackgroundCustom: true,
    });
    const hydrated = hydrateDashboardStyle(patched);
    expect(resolveArtboardStyle(hydrated).background).toBe("#7556b8");
  });

  it("seed layout with decor id only materializes gradient background on hydrate", () => {
    const seeded = {
      surfaceKind: "data-screen" as const,
      colorScheme: "dark" as const,
      canvasDecorPresetId: "gradient-radial" as const,
    };
    expect(seeded.canvasBackground).toBeUndefined();

    const hydrated = hydrateDashboardStyle(seeded);
    expect(hydrated.canvasBackgroundCustom).toBe(true);
    expect(hydrated.canvasBackground).toContain("radial-gradient");
    expect(hasUserCanvasBackground(hydrated)).toBe(true);
    expect(resolveArtboardStyle(hydrated).background).toContain("radial-gradient");
  });

  it("materializeDecorStyleConfig leaves custom image backgrounds untouched", () => {
    const withImage = materializeDecorStyleConfig({
      colorScheme: "dark",
      canvasBackgroundCustom: true,
      canvasBackground: "#0f172a",
      canvasBackgroundImage: "/template-assets/backgrounds/screen-gov-indigo.svg",
      canvasDecorPresetId: "gradient-soft",
    });
    expect(withImage.canvasBackgroundImage).toBe(
      "/template-assets/backgrounds/screen-gov-indigo.svg",
    );
  });

  it("preserves uploaded data URL through patch + hydrate", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const base = bootstrapDashboardStyleConfig({ colorScheme: "light" });
    const { styleConfig: patched } = applyDashboardStylePatch(base, [], {
      canvasBackgroundImage: dataUrl,
      canvasBackgroundCustom: true,
      canvasDecorPresetId: "custom",
    });
    const hydrated = hydrateDashboardStyle(patched);
    expect(hydrated.canvasBackgroundImage).toBe(dataUrl);
    expect(hydrated.canvasDecorPresetId).toBe("custom");
  });
});
