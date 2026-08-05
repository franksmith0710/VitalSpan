import { describe, expect, it } from "vitest";
import liveDash from "../../live-dash-response.json";
import { prepareDashboardLayout } from "@/components/dashboard/dashboardCanvasMode";
import {
  coerceLayoutWidgets,
  sortWidgets,
  type DashboardLayout,
} from "@/components/dashboard/layoutUtils";
import { normalizeWidgetLayout } from "@/components/dashboard/gridLayoutAdapter";
import {
  editorResetBaselineSnapshot,
  hydrateDashboardStyle,
  preparePixelLayoutForDisplay,
  syncPixelLayoutChartStyles,
} from "@/components/dashboard/stylePipeline";
import { resolveDashboardLayoutJson } from "@/lib/resolveDashboardLayoutJson";

describe("live dashboard load pipeline", () => {
  it("hydrates editor state from live API payload", () => {
    const layoutJson = resolveDashboardLayoutJson(liveDash as DashboardLayout);
    const source =
      layoutJson.version === 1
        ? {
            ...layoutJson,
            widgets: normalizeWidgetLayout(
              sortWidgets(coerceLayoutWidgets(layoutJson.widgets ?? [])),
            ),
          }
        : layoutJson;
    const prepared = prepareDashboardLayout(source, true);
    const hydratedStyle = hydrateDashboardStyle(prepared.layout.styleConfig);
    let layoutForEditor = {
      ...prepared.layout,
      styleConfig: hydratedStyle,
    };
    if (layoutForEditor.version === 2) {
      layoutForEditor = syncPixelLayoutChartStyles(
        layoutForEditor,
        hydratedStyle.colorScheme ?? "light",
      );
      layoutForEditor = preparePixelLayoutForDisplay(layoutForEditor, hydratedStyle);
    }
    const snap = editorResetBaselineSnapshot(layoutForEditor, hydratedStyle, true);
    expect(layoutForEditor.widgets.length).toBe(4);
    expect(snap.fingerprint.length).toBeGreaterThan(0);
  });
});
