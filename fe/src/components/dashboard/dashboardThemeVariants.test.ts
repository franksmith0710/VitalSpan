import { describe, expect, it } from "vitest";
import {
  defaultThemeVariant,
  initializeDualThemePresets,
  normalizeStyleConfigForColorScheme,
  switchDashboardColorScheme,
  switchDashboardThemeBundle,
  syncChartWidgetsForColorScheme,
} from "./dashboardThemeVariants";
import { CANVAS_BG_DARK_DEFAULT } from "./dashboardStyleConfig";

describe("dashboardThemeVariants", () => {
  it("switching to dark applies default dark canvas when no variant saved", () => {
    const next = switchDashboardColorScheme({ colorScheme: "light" }, "dark");
    expect(next.colorScheme).toBe("dark");
    expect(next.canvasBackground).toBe(CANVAS_BG_DARK_DEFAULT);
    expect(next.themeVariants?.light).toBeDefined();
    expect(next.themeVariants?.dark).toBeDefined();
  });

  it("round-trips custom light accent through variant store", () => {
    const customized = switchDashboardColorScheme(
      { colorScheme: "light", themeAccent: "#ff0000" },
      "dark",
    );
    const back = switchDashboardColorScheme(customized, "light");
    expect(back.themeAccent).toBe("#ff0000");
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
