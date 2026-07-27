import { describe, expect, it } from "vitest";
import { createLinkedLayoutWidget } from "@/components/dashboard/createLayoutWidget";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";
import { relinkWidgetToComponent, isPublishableWidgetType } from "./vizComponentEdit";
import { buildComponentMap, resolveLayoutWidget } from "./resolveVizComponent";
import type { VizComponentDetail } from "./vizComponents";

describe("createLinkedLayoutWidget", () => {
  it("creates ref-only widget without inline payload", () => {
    const linked = createLinkedLayoutWidget(
      { id: "c1", name: "柱状图", widgetType: "chart" },
      [],
    );
    expect(linked.componentRef).toEqual({ componentId: "c1" });
    expect(linked.chartConfig).toBeUndefined();
    expect(linked.type).toBe("chart");
  });
});

describe("vizComponentEdit", () => {
  it("relinkWidgetToComponent strips inline payload and restores componentRef", () => {
    const widget = {
      id: "w1",
      type: "chart",
      title: "本地",
      colSpan: 6,
      rowSpan: 4,
      order: 0,
      chartConfig: { chartId: "w1", chartType: "bar" },
      componentRef: { componentId: "c1", detached: true },
    } as LayoutWidget;

    const relinked = relinkWidgetToComponent(widget, "c1");
    expect(relinked.componentRef).toEqual({ componentId: "c1" });
    expect(relinked.chartConfig).toBeUndefined();
  });

  it("isPublishableWidgetType covers chart/filter/text/media only", () => {
    expect(isPublishableWidgetType("chart")).toBe(true);
    expect(isPublishableWidgetType("filter")).toBe(true);
    expect(isPublishableWidgetType("tabs")).toBe(false);
  });
});

describe("resolveLayoutWidget linked filter", () => {
  it("resolves filterConfig from component map for linkage", () => {
    const component: VizComponentDetail = {
      id: "fc1",
      name: "区域筛选",
      widgetType: "filter",
      surfaceKind: "dashboard",
      categoryKey: "filter",
      status: "published",
      contentRevision: 2,
      payloadJson: {
        filterConfig: {
          filterId: "placeholder",
          controlType: "select",
          label: "区域",
          fieldKey: "region",
        },
      },
      createdAt: "",
      updatedAt: "",
    };
    const map = buildComponentMap([component]);
    const widget = {
      id: "w-filter",
      type: "filter",
      title: "筛选",
      colSpan: 4,
      rowSpan: 1,
      order: 0,
      componentRef: { componentId: "fc1" },
    } as LayoutWidget;

    const resolved = resolveLayoutWidget(widget, map);
    expect(resolved.filterConfig?.filterId).toBe("w-filter");
    expect(resolved.filterConfig?.fieldKey).toBe("region");
  });
});
