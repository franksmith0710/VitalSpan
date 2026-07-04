import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchChartTypeCatalog } from "@/lib/chartRegistry";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

describe("chartRegistry", () => {
  beforeEach(() => mockApiFetch.mockReset());

  it("T-VIZ-R43-003-02: fetchChartTypeCatalog mock 9 类型含 map", async () => {
    mockApiFetch.mockResolvedValueOnce([
      {
        type: "table",
        displayName: "表格",
        category: "basic",
        renderer: "table",
        styleVariants: ["default"],
        fieldRule: {},
      },
      {
        type: "map",
        displayName: "地图",
        category: "geo",
        renderer: "echarts",
        styleVariants: ["default"],
        fieldRule: { minDimensions: 1 },
      },
      {
        type: "sankey",
        displayName: "桑基",
        category: "flow",
        renderer: "echarts",
        styleVariants: ["default"],
        fieldRule: {},
      },
      {
        type: "funnel",
        displayName: "漏斗",
        category: "flow",
        renderer: "echarts",
        styleVariants: ["default"],
        fieldRule: {},
      },
      {
        type: "graph",
        displayName: "关系",
        category: "relation",
        renderer: "echarts",
        styleVariants: ["default"],
        fieldRule: {},
      },
      {
        type: "gauge",
        displayName: "仪表",
        category: "advanced",
        renderer: "echarts",
        styleVariants: ["default"],
        fieldRule: {},
      },
      {
        type: "line",
        displayName: "折线",
        category: "basic",
        renderer: "echarts",
        styleVariants: ["default"],
        fieldRule: {},
      },
      {
        type: "bar",
        displayName: "柱",
        category: "basic",
        renderer: "echarts",
        styleVariants: ["default", "stacked"],
        fieldRule: {},
      },
      {
        type: "pie",
        displayName: "饼",
        category: "basic",
        renderer: "echarts",
        styleVariants: ["default"],
        fieldRule: {},
      },
    ]);
    const catalog = await fetchChartTypeCatalog();
    expect(catalog.map((c) => c.type)).toContain("map");
    expect(catalog.length).toBe(9);
  });
});

import { getEchartsTheme } from "@/lib/echarts-theme";

describe("echarts-theme", () => {
  it("T-VIZ-R43-003-03: echarts-theme 暗色 label 色非空", () => {
    const theme = getEchartsTheme(true);
    const textStyle = theme.textStyle as { color?: string };
    expect(textStyle?.color).toBeTruthy();
    expect(textStyle?.color).not.toBe("#ffffff");
  });
});
