import { describe, expect, it } from "vitest";
import { defaultChartConfig } from "./layoutUtils";
import {
  applyWidgetQuickStyleAction,
  readWidgetChartQuickStyleState,
  readWidgetShellStyleState,
  supportsWidgetQuickStyleAction,
} from "./widgetContextMenuStyle";

describe("widgetContextMenuStyle", () => {
  const chartWidget = {
    id: "w1",
    type: "chart" as const,
    title: "图表",
    colSpan: 6,
    rowSpan: 3,
    order: 0,
    chartConfig: defaultChartConfig("bar"),
  };

  it("toggles chart title visibility on dashboard surface", () => {
    const next = applyWidgetQuickStyleAction(chartWidget, "toggleTitle", {
      surface: "dashboard",
    });
    expect(readWidgetShellStyleState(next, { surface: "dashboard" }).titleVisible).toBe(false);
  });

  it("applies data-screen backdrop blur preset", () => {
    const next = applyWidgetQuickStyleAction(chartWidget, "toggleBackdropBlur", {
      surface: "data-screen",
    });
    expect(
      readWidgetShellStyleState(next, { surface: "data-screen" }).backdropBlur,
    ).toBe(12);
  });

  it("toggles chart legend visibility", () => {
    const next = applyWidgetQuickStyleAction(chartWidget, "toggleLegend", {
      surface: "dashboard",
    });
    expect(readWidgetChartQuickStyleState(next, { surface: "dashboard" }).legendVisible).toBe(false);
  });

  it("applies chart palette preset", () => {
    const next = applyWidgetQuickStyleAction(
      chartWidget,
      "setPalette",
      { surface: "dashboard" },
      { paletteId: "pastel" },
    );
    expect(readWidgetChartQuickStyleState(next, { surface: "dashboard" }).paletteLabel).toBe("浅韵");
  });

  it("limits title toggle to chart widgets", () => {
    expect(supportsWidgetQuickStyleAction({ type: "text" }, "toggleTitle")).toBe(false);
    expect(supportsWidgetQuickStyleAction({ type: "chart" }, "toggleTitle")).toBe(true);
  });

  it("supports customViz shell quick actions", () => {
    expect(supportsWidgetQuickStyleAction({ type: "customViz" }, "toggleBorder")).toBe(true);
    expect(supportsWidgetQuickStyleAction({ type: "customViz" }, "toggleTitle")).toBe(false);
  });

  it("toggles customViz border via widgetStyle override", () => {
    const widget = {
      id: "w-cv",
      type: "customViz" as const,
      title: "外部组件",
      colSpan: 6,
      rowSpan: 4,
      order: 0,
      customVizConfig: {
        artifactId: "550e8400-e29b-41d4-a716-446655440000",
        widgetStyle: { borderEnabled: true },
      },
    };
    const next = applyWidgetQuickStyleAction(widget, "toggleBorder", {
      surface: "dashboard",
      dashboardStyle: { widgetStyle: { borderEnabled: true } },
    });
    expect(next.customVizConfig?.widgetStyle?.borderEnabled).toBe(false);
  });

  it("inherits dashboard widgetStyle when customViz has no override", () => {
    const widget = {
      id: "w-cv",
      type: "customViz" as const,
      title: "外部组件",
      colSpan: 6,
      rowSpan: 4,
      order: 0,
      customVizConfig: { artifactId: "550e8400-e29b-41d4-a716-446655440000" },
    };
    const state = readWidgetShellStyleState(widget, {
      surface: "dashboard",
      dashboardStyle: { widgetStyle: { opacity: 0.6, borderEnabled: false } },
    });
    expect(state.opacity).toBe(0.6);
    expect(state.borderEnabled).toBe(false);
  });
});
