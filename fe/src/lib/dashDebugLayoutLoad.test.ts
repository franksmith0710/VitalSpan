import { describe, expect, it } from "vitest";
import layout from "../../dash-debug-layout.json";
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
} from "@/components/dashboard/stylePipeline";

describe("dash debug layout load", () => {
  it("prepares editor layout without throwing", () => {
    const source = {
      ...(layout as DashboardLayout),
      widgets: normalizeWidgetLayout(sortWidgets(coerceLayoutWidgets(layout.widgets ?? []))),
    };
    const prepared = prepareDashboardLayout(source, true);
    const hydrated = hydrateDashboardStyle(prepared.layout.styleConfig);
    const snap = editorResetBaselineSnapshot(prepared.layout, hydrated, true);
    expect(prepared.layout.widgets.length).toBe(4);
    expect(snap.fingerprint.length).toBeGreaterThan(0);
  });
});
