import { describe, expect, it } from "vitest";
import {
  coerceLayoutWidget,
  coerceLayoutWidgets,
  defaultFilterConfig,
  normalizeWidgetIds,
} from "./layoutUtils";

describe("layoutUtils filter type", () => {
  it("defaults missing type to chart", () => {
    const w = coerceLayoutWidget({
      id: "w1",
      title: "旧组件",
      colSpan: 6,
      rowSpan: 2,
      order: 0,
      chartConfig: {
        chartType: "bar",
        dataSourceId: "ds",
        mode: "sql",
        sql: "select 1",
        dimensions: [],
        metrics: [],
      },
    } as Parameters<typeof coerceLayoutWidget>[0]);
    expect(w.type).toBe("chart");
    expect(w.chartConfig?.chartType).toBe("bar");
  });

  it("coerces filter widgets with default filterConfig", () => {
    const w = coerceLayoutWidget({ id: "f1", type: "filter", title: "区域", order: 0, colSpan: 4, rowSpan: 2 });
    expect(w.type).toBe("filter");
    expect(w.filterConfig?.filterId).toBe("f1");
    expect(w.filterConfig?.controlType).toBe("text");
  });

  it("normalizeWidgetIds skips filter widgets", () => {
    const filter = coerceLayoutWidget({
      id: "f1",
      type: "filter",
      title: "筛选",
      order: 0,
      colSpan: 4,
      rowSpan: 2,
      filterConfig: defaultFilterConfig("f1"),
    });
    const next = normalizeWidgetIds([filter]);
    expect(next[0].filterConfig?.filterId).toBe("f1");
    expect(next[0].chartConfig).toBeUndefined();
  });

  it("coerceLayoutWidgets batch", () => {
    const list = coerceLayoutWidgets([
      { id: "a", title: "A", order: 0, colSpan: 6, rowSpan: 1 },
      { id: "b", type: "filter", title: "B", order: 1, colSpan: 4, rowSpan: 2 },
    ]);
    expect(list[0].type).toBe("chart");
    expect(list[1].type).toBe("filter");
  });
});
