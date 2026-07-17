import { describe, expect, it } from "vitest";
import { buildDefaultLayoutForSurface, getSurfacePreset } from "./surfacePreset";

describe("surfacePreset", () => {
  it("dashboard preset uses 1440 light canvas", () => {
    const preset = getSurfacePreset("dashboard");
    expect(preset.canvas).toEqual({ width: 1440, height: 320 });
    expect(preset.defaultStyle.surfaceKind).toBe("dashboard");
    expect(preset.defaultStyle.colorScheme).toBe("light");
  });

  it("data-screen preset uses 1920x1080 dark canvas", () => {
    const preset = getSurfacePreset("data-screen");
    expect(preset.canvas).toEqual({ width: 1920, height: 1080 });
    expect(preset.defaultStyle.surfaceKind).toBe("data-screen");
    expect(preset.defaultStyle.colorScheme).toBe("dark");
    expect(preset.defaultStyle.gapPreset).toBe("none");
  });

  it("buildDefaultLayoutForSurface embeds styleConfig", () => {
    const layout = buildDefaultLayoutForSurface("data-screen");
    expect(layout.version).toBe(2);
    expect(layout.canvas).toEqual({ width: 1920, height: 1080 });
    expect(layout.styleConfig?.surfaceKind).toBe("data-screen");
  });
});
