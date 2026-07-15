import { describe, expect, it } from "vitest";
import {
  bootstrapDashboardStyleConfig,
  defaultThemeVariant,
  hydrateDashboardStyleConfig,
  initializeDualThemePresets,
  normalizeStyleConfigForColorScheme,
  resolveThemePresetForSwitch,
  switchDashboardColorScheme,
  switchDashboardThemeBundle,
  syncChartWidgetsForColorScheme,
} from "./dashboardThemeVariants";
import { CANVAS_BG_DARK_DEFAULT, CANVAS_BG_LIGHT_DEFAULT } from "./dashboardStyleConfig";

describe("dashboardThemeVariants", () => {
  it("switching to dark applies default dark canvas when no variant saved", () => {
    const next = switchDashboardColorScheme({ colorScheme: "light" }, "dark");
    expect(next.colorScheme).toBe("dark");
    expect(next.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
    expect(next.themeVariants?.light).toBeDefined();
    expect(next.themeVariants?.dark).toBeDefined();
  });

  it("round-trips custom §5.3 canvas through variant store", () => {
    const customized = switchDashboardColorScheme(
      {
        colorScheme: "light",
        canvasBackground: "#f1c40f",
        canvasBackgroundCustom: true,
      },
      "dark",
    );
    const back = switchDashboardColorScheme(customized, "light");
    expect(back.canvasBackground).toBe("#f1c40f");
    expect(back.canvasBackgroundCustom).toBe(true);
  });

  it("initializeDualThemePresets seeds both schemes", () => {
    const next = initializeDualThemePresets({ colorScheme: "light" });
    expect(next.themeVariants?.light?.canvasBackground).toBe(
      defaultThemeVariant("light").canvasBackground,
    );
    expect(next.themeVariants?.dark?.canvasBackground).toBe(
      defaultThemeVariant("dark").canvasBackground,
    );
  });

  it("hydrateDashboardStyleConfig seeds missing dual variants on empty config", () => {
    const next = hydrateDashboardStyleConfig({});
    expect(next.themeVariants?.light?.canvasBackground).toBe(CANVAS_BG_LIGHT_DEFAULT);
    expect(next.themeVariants?.dark?.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
    expect(next.themeVariants?.dark?.widgetStyle?.background).toBe("#1e293b");
  });

  it("bootstrap promotes legacy root fields to active variant only", () => {
    const next = bootstrapDashboardStyleConfig({
      colorScheme: "dark",
      canvasBackground: "#0f172a",
      widgetStyle: { background: "#1e293b" },
    });
    expect(next.themeVariants?.dark?.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
    expect(next.themeVariants?.light?.canvasBackground).toBe(CANVAS_BG_LIGHT_DEFAULT);
    expect(next.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
  });

  it("bootstrap is idempotent once variants are seeded", () => {
    const once = bootstrapDashboardStyleConfig({ colorScheme: "light" });
    const twice = bootstrapDashboardStyleConfig(once);
    expect(twice).toEqual(once);
  });

  it("hydrateDashboardStyleConfig normalizes active dark root and keeps light variant", () => {
    const next = hydrateDashboardStyleConfig({
      colorScheme: "dark",
      canvasBackground: "#eff6ff",
      widgetStyle: { background: "#ffffff" },
    });
    expect(next.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
    expect(next.widgetStyle?.background).toBe("#1e293b");
    expect(next.themeVariants?.light?.canvasBackground).toBe(CANVAS_BG_LIGHT_DEFAULT);
    expect(next.themeVariants?.dark?.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
  });

  it("hydrateDashboardStyleConfig resets deprecated themeAccent to standard presets", () => {
    const next = hydrateDashboardStyleConfig({
      colorScheme: "dark",
      themeAccent: "#f79009",
      canvasBackground: "#172033",
      widgetStyle: { background: "#243047" },
    });
    expect(next.themeAccent).toBeUndefined();
    expect(next.themeVariants?.light).toEqual(defaultThemeVariant("light"));
    expect(next.themeVariants?.dark?.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
    expect(next.themeVariants?.dark?.widgetStyle?.background).toBe("#1e293b");
  });

  it("switching themes after hydrate applies standard inactive preset", () => {
    const hydrated = hydrateDashboardStyleConfig({ colorScheme: "dark" });
    const light = switchDashboardColorScheme(hydrated, "light");
    expect(light.canvasBackground).toBe(CANVAS_BG_LIGHT_DEFAULT);
    expect(light.widgetStyle?.background).toBe("#ffffff");
  });

  it("legacy light blue canvas without custom flag resets on theme switch", () => {
    const dark = bootstrapDashboardStyleConfig({ colorScheme: "dark" });
    const polluted = {
      ...dark,
      themeVariants: {
        ...dark.themeVariants,
        light: {
          canvasBackground: "#eff6ff",
          widgetStyle: { background: "#ffffff" },
        },
      },
    };
    const light = switchDashboardColorScheme(polluted, "light");
    expect(light.canvasBackground).toBe(CANVAS_BG_LIGHT_DEFAULT);
    expect(light.canvasBackgroundCustom).toBeUndefined();
  });

  it("custom §5.3 canvas survives theme round-trip", () => {
    const base = bootstrapDashboardStyleConfig({
      colorScheme: "light",
      canvasBackground: "#f1c40f",
      canvasBackgroundCustom: true,
    });
    const dark = switchDashboardColorScheme(base, "dark");
    const back = switchDashboardColorScheme(dark, "light");
    expect(back.canvasBackground).toBe("#f1c40f");
    expect(back.canvasBackgroundCustom).toBe(true);
  });

  it("normalize preserves custom title color on same scheme reload", () => {
    const next = normalizeStyleConfigForColorScheme({
      colorScheme: "light",
      titleStyle: { color: "#884422" },
    });
    expect(next.titleStyle?.color).toBe("#884422");
  });

  it("normalize clears light gradient and decor when colorScheme is dark", () => {
    const next = normalizeStyleConfigForColorScheme({
      colorScheme: "dark",
      canvasBackground: "linear-gradient(160deg, #eff6ff 0%, #f8fafc 45%, #fef3c7 100%)",
      widgetStyle: { background: "#ffffff" },
    });
    expect(next.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
    expect(next.canvasBackgroundImage).toBeUndefined();
    expect(next.widgetStyle?.background).toBe("#1e293b");
  });

  it("normalize coerces light blue canvas swatch when colorScheme is dark", () => {
    const next = normalizeStyleConfigForColorScheme({
      colorScheme: "dark",
      canvasBackground: "#eff6ff",
    });
    expect(next.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
  });

  it("syncChartWidgetsForColorScheme resets per-chart deStyle background on dark", () => {
    const widgets = syncChartWidgetsForColorScheme(
      [
        {
          id: "w1",
          type: "chart",
          title: "柱图",
          colSpan: 6,
          rowSpan: 4,
          chartConfig: {
            mode: "dataset",
            chartType: "bar",
            dataSourceId: "ds1",
            configId: "c1",
            nativeBody: {
              deStyle: { background: { background: "#57617a" } },
            },
          },
        },
      ],
      "dark",
    );
    expect(
      widgets[0].type === "chart" &&
        widgets[0].chartConfig?.nativeBody?.deStyle?.background?.background,
    ).toBe("#1e293b");
  });

  it("switchDashboardThemeBundle syncs styleConfig and widgets together", () => {
    const bundle = switchDashboardThemeBundle(
      { colorScheme: "light", canvasBackground: "#eff6ff" },
      [
        {
          id: "w1",
          type: "chart",
          title: "柱图",
          colSpan: 6,
          rowSpan: 4,
          chartConfig: {
            mode: "dataset",
            chartType: "bar",
            dataSourceId: "ds1",
            configId: "c1",
            nativeBody: {
              deStyle: { background: { background: "#ffffff" } },
            },
          },
        },
      ],
      "dark",
    );
    expect(bundle.styleConfig.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
    expect(
      bundle.widgets[0].type === "chart" &&
        bundle.widgets[0].chartConfig?.nativeBody?.deStyle?.background?.background,
    ).toBe("#1e293b");
  });
});
