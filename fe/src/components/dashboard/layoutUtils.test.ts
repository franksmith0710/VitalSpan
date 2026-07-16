import { describe, expect, it } from "vitest";
import {
  coerceLayoutWidget,
  coerceLayoutWidgets,
  defaultFilterConfig,
  defaultTabsConfig,
  findTabsHostAtPoint,
  getTopLevelPixelWidgets,
  insertPixelWidgetIntoTab,
  resolvePixelTabsHost,
  normalizeWidgetIds,
  parkPixelWidgetInTab,
} from "./layoutUtils";
import type { PixelLayoutWidget } from "./dashboardLayoutContracts";

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

describe("layoutUtils tabs", () => {
  it("defaultTabsConfig seeds three panes", () => {
    const cfg = defaultTabsConfig("tabs-1");
    expect(cfg.panes).toHaveLength(3);
    expect(cfg.panes[0]?.title).toBe("页签 1");
  });

  it("getTopLevelPixelWidgets excludes tab children", () => {
    const host: PixelLayoutWidget = {
      id: "tabs",
      type: "tabs",
      title: "页签",
      order: 0,
      x: 10,
      y: 20,
      width: 400,
      height: 240,
      tabsConfig: defaultTabsConfig("tabs"),
    };
    const child: PixelLayoutWidget = {
      id: "chart-1",
      type: "chart",
      title: "图表",
      order: 1,
      x: 0,
      y: 0,
      width: 320,
      height: 200,
      parentTabsId: "tabs",
      tabPaneId: host.tabsConfig!.panes[0]!.id,
      chartConfig: {
        chartType: "bar",
        dataSourceId: "ds",
        mode: "sql",
        sql: "select 1",
        dimensions: [],
        metrics: [],
      },
    };
    expect(getTopLevelPixelWidgets([host, child])).toEqual([host]);
  });

  it("parkPixelWidgetInTab collapses child rect into host", () => {
    const host: PixelLayoutWidget = {
      id: "tabs",
      type: "tabs",
      title: "页签",
      order: 0,
      x: 48,
      y: 96,
      width: 720,
      height: 320,
      tabsConfig: defaultTabsConfig("tabs"),
    };
    const child: PixelLayoutWidget = {
      id: "chart-1",
      type: "chart",
      title: "图表",
      order: 1,
      x: 200,
      y: 300,
      width: 480,
      height: 300,
      chartConfig: {
        chartType: "bar",
        dataSourceId: "ds",
        mode: "sql",
        sql: "select 1",
        dimensions: [],
        metrics: [],
      },
    };
    const paneId = host.tabsConfig!.panes[0]!.id;
    const parked = parkPixelWidgetInTab(child, host, paneId);
    expect(parked.parentTabsId).toBe("tabs");
    expect(parked.tabPaneId).toBe(paneId);
    expect(parked).toMatchObject({ x: 48, y: 96, width: 0, height: 0 });
  });

  it("findTabsHostAtPoint returns smallest overlapping tab host", () => {
    const outer: PixelLayoutWidget = {
      id: "tabs-outer",
      type: "tabs",
      title: "外",
      order: 0,
      x: 0,
      y: 0,
      width: 600,
      height: 400,
      tabsConfig: defaultTabsConfig("tabs-outer"),
    };
    const inner: PixelLayoutWidget = {
      id: "tabs-inner",
      type: "tabs",
      title: "内",
      order: 1,
      x: 40,
      y: 40,
      width: 200,
      height: 120,
      tabsConfig: defaultTabsConfig("tabs-inner"),
    };
    expect(findTabsHostAtPoint([outer, inner], { x: 100, y: 80 })?.id).toBe("tabs-inner");
  });

  it("insertPixelWidgetIntoTab parks child and updates pane ids", () => {
    const host: PixelLayoutWidget = {
      id: "tabs",
      type: "tabs",
      title: "页签",
      order: 0,
      x: 10,
      y: 20,
      width: 400,
      height: 240,
      tabsConfig: defaultTabsConfig("tabs"),
    };
    const draft: PixelLayoutWidget = {
      id: "chart-1",
      type: "chart",
      title: "图表",
      order: 1,
      x: 200,
      y: 300,
      width: 480,
      height: 300,
      chartConfig: {
        chartType: "bar",
        dataSourceId: "ds",
        mode: "sql",
        sql: "select 1",
        dimensions: [],
        metrics: [],
      },
    };
    const paneId = host.tabsConfig!.panes[0]!.id;
    const layout = {
      version: 2 as const,
      canvas: { width: 1440, height: 900 },
      widgets: [host, draft],
      globalFilters: [],
    };
    const next = insertPixelWidgetIntoTab(layout, draft, host, paneId);
    const child = next.widgets.find((w) => w.id === "chart-1");
    const tabs = next.widgets.find((w) => w.id === "tabs");
    expect(child?.parentTabsId).toBe("tabs");
    expect(child).toMatchObject({ width: 0, height: 0, x: 10, y: 20 });
    expect(tabs?.tabsConfig?.panes[0]?.childWidgetIds).toContain("chart-1");
  });

  it("resolvePixelTabsHost prefers selected tab over point miss", () => {
    const host: PixelLayoutWidget = {
      id: "tabs",
      type: "tabs",
      title: "页签",
      order: 0,
      x: 100,
      y: 100,
      width: 400,
      height: 240,
      tabsConfig: defaultTabsConfig("tabs"),
    };
    const layout = {
      version: 2 as const,
      canvas: { width: 1440, height: 900 },
      widgets: [host],
      globalFilters: [],
    };
    expect(resolvePixelTabsHost(layout, "tabs", { x: 0, y: 0 })?.id).toBe("tabs");
  });
});
