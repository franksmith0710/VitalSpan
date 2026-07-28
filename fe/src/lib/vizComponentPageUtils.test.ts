import { describe, expect, it } from "vitest";
import {
  componentDetailToLayoutWidget,
  componentEditorSnapshot,
  widgetEditorSnapshot,
} from "./vizComponentPageUtils";
import type { VizComponentDetail } from "./vizComponents";

const baseDetail: Omit<VizComponentDetail, "widgetType" | "payloadJson"> = {
  id: "c1",
  componentKey: "vc-test",
  name: "测试组件",
  description: null,
  categoryKey: "general",
  surfaceKinds: ["dashboard"],
  status: "published",
  thumbnailRef: null,
  tags: [],
  visibility: "org",
  ownerUserId: null,
  orgScope: null,
  contentRevision: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  publishedAt: "2026-01-01T00:00:00Z",
};

describe("componentDetailToLayoutWidget", () => {
  it("maps chart payload to synthetic layout widget", () => {
    const detail: VizComponentDetail = {
      ...baseDetail,
      widgetType: "chart",
      payloadJson: {
        chartConfig: { chartId: "x", chartType: "bar", dimensions: [], metrics: [] },
      },
    };
    const widget = componentDetailToLayoutWidget(detail);
    expect(widget.type).toBe("chart");
    expect(widget.componentRef).toEqual({ componentId: "c1" });
    expect(widget.chartConfig?.chartType).toBe("bar");
    expect(widget.title).toBe("测试组件");
  });

  it("maps filter payload", () => {
    const detail: VizComponentDetail = {
      ...baseDetail,
      widgetType: "filter",
      payloadJson: {
        filterConfig: {
          filterId: "f1",
          dimensionRef: "region",
          controlType: "select",
        },
      },
    };
    const widget = componentDetailToLayoutWidget(detail);
    expect(widget.type).toBe("filter");
    expect(widget.filterConfig?.dimensionRef).toBe("region");
  });
});

describe("component editor snapshots", () => {
  it("detects dirty when chart config changes", () => {
    const detail: VizComponentDetail = {
      ...baseDetail,
      widgetType: "chart",
      payloadJson: {
        chartConfig: { chartId: "x", chartType: "bar", dimensions: [], metrics: [] },
      },
    };
    const widget = componentDetailToLayoutWidget(detail);
    expect(widgetEditorSnapshot(widget)).toBe(componentEditorSnapshot(detail));

    const dirty = { ...widget, chartConfig: { ...widget.chartConfig!, chartType: "line" } };
    expect(widgetEditorSnapshot(dirty)).not.toBe(componentEditorSnapshot(detail));
  });
});
