import { describe, expect, it } from "vitest";
import {
  buildDataScreenLayoutFromTemplate,
  exportDataScreenTemplate,
  parseImportedDataScreenLayout,
} from "./dataScreenTemplates";
import { isScreenClockWidget } from "./screenVisualAssets";

describe("dataScreenTemplates", () => {
  it("command-center template includes L1 slots and chart placeholders", () => {
    const layout = buildDataScreenLayoutFromTemplate("command-center");
    expect(layout.widgets.length).toBeGreaterThanOrEqual(10);
    expect(layout.widgets.filter((w) => w.type === "chart").length).toBe(3);
  });

  it("tech-blue template includes clock and border widgets", () => {
    const layout = buildDataScreenLayoutFromTemplate("tech-blue");
    expect(layout.version).toBe(2);
    expect(layout.canvas).toEqual({ width: 1920, height: 1080 });
    expect(layout.styleConfig?.surfaceKind).toBe("data-screen");
    expect(layout.widgets.some(isScreenClockWidget)).toBe(true);
    expect(layout.widgets.length).toBeGreaterThanOrEqual(3);
  });

  it("parseImportedDataScreenLayout normalizes surface kind", () => {
    const layout = parseImportedDataScreenLayout({
      version: 2,
      canvas: { width: 1920, height: 1080 },
      widgets: [],
      globalFilters: [],
      styleConfig: { colorScheme: "dark" },
    });
    expect(layout.styleConfig?.surfaceKind).toBe("data-screen");
  });

  it("rejects non-v2 layout", () => {
    expect(() =>
      parseImportedDataScreenLayout({ version: 1, widgets: [] }),
    ).toThrow(/version 2/);
  });

  it("round-trips template export wrapper", () => {
    const layout = buildDataScreenLayoutFromTemplate("blank");
    const exported = exportDataScreenTemplate(layout, "演示大屏");
    expect(exported.templateVersion).toBe(1);
    expect(exported.kind).toBe("viz-layout");
    const imported = parseImportedDataScreenLayout(exported);
    expect(imported.canvas).toEqual(layout.canvas);
    expect(imported.styleConfig?.surfaceKind).toBe("data-screen");
  });
});
