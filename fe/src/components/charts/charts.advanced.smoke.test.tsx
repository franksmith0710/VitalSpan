import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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

import { buildEchartsOption, type RenderSpec } from "@/components/charts/adapters/renderFromSpec";

describe("renderFromSpec", () => {
  it("T-VIZ-R43-008-01: funnel 合法 spec+rows → series[0].type===funnel", () => {
    const spec: RenderSpec = {
      engine: "echarts",
      chartType: "funnel",
      styleVariant: "default",
      encoding: { dimensions: [{ field: "stage" }], metrics: [{ field: "value" }] },
      source: {},
    };
    const columns = ["stage", "value"];
    const rows = [["A", 100], ["B", 60], ["C", 30]];
    const option = buildEchartsOption(spec, rows, columns);
    expect((option.series as Array<{ type: string }>)[0].type).toBe("funnel");
  });

  it("T-VIZ-R43-008-02: graph 201 节点 → option 节点数 ≤200", () => {
    const spec: RenderSpec = {
      engine: "echarts",
      chartType: "graph",
      styleVariant: "default",
      encoding: {
        dimensions: [{ field: "src" }, { field: "dst" }],
        metrics: [{ field: "w" }],
      },
      source: {},
    };
    const columns = ["src", "dst", "w"];
    const rows = Array.from({ length: 201 }, (_, i) => [`n${i}`, `n${i + 1}`, 1]);
    const option = buildEchartsOption(spec, rows, columns);
    const nodes = (option.series as Array<{ data: unknown[] }>)[0].data;
    expect(nodes.length).toBeLessThanOrEqual(200);
  });
});

vi.mock("echarts-for-react", () => ({
  default: () => <div data-testid="echarts-chart" />,
}));

import { cleanup, render, screen } from "@testing-library/react";
import { AdvancedEchartsChart } from "@/components/charts/adapters/AdvancedEchartsChart";

describe("AdvancedEchartsChart", () => {
  it("T-VIZ-R43-003-01: map + 3 省 mock → echarts 容器", () => {
    render(
      <AdvancedEchartsChart
        spec={{
          engine: "echarts",
          chartType: "map",
          styleVariant: "default",
          encoding: { dimensions: [{ field: "region" }], metrics: [{ field: "v" }] },
          source: {},
        }}
        rows={[["北京", 1], ["上海", 2], ["广东", 3]]}
        columns={["region", "v"]}
        ariaLabel="地图"
      />,
    );
    expect(screen.getByTestId("echarts-chart")).toBeInTheDocument();
  });
});

import userEvent from "@testing-library/user-event";
import { ChartConfigPanel } from "@/components/charts/ChartConfigPanel";
import type { ChartViewConfig } from "@/lib/chartViewConfig";

describe("ChartConfigPanel", () => {
  afterEach(() => cleanup());

  it("T-VIZ-R43-005-02: funnel 缺 metric → 配置面板展示字段错误文案", async () => {
    const cfg: ChartViewConfig = {
      chartType: "funnel",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT 1",
      dimensions: [{ field: "stage" }],
      metrics: [],
    };
    mockApiFetch.mockResolvedValueOnce([]);
    mockApiFetch.mockRejectedValueOnce(
      Object.assign(new Error("字段不符合要求"), {
        code: "CHART_FIELD_REQUIREMENT",
        fields: [{ field: "metrics", message: "至少 1 个度量" }],
      }),
    );
    render(<ChartConfigPanel config={cfg} columns={["stage", "value"]} onChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "校验配置" }));
    expect(await screen.findByText("至少 1 个度量")).toBeInTheDocument();
  });

  it("T-VIZ-R43-004-02: styleVariant=invalid → alert 含样式或错误码", async () => {
    const cfg: ChartViewConfig = {
      chartType: "bar",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT 1",
      styleVariant: "invalid",
      dimensions: [{ field: "d" }],
      metrics: [{ field: "m" }],
    };
    mockApiFetch.mockResolvedValueOnce([]);
    mockApiFetch.mockRejectedValueOnce(
      Object.assign(new Error("样式无效"), { code: "CHART_INVALID_STYLE_VARIANT" }),
    );
    render(<ChartConfigPanel config={cfg} columns={["d", "m"]} onChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "校验配置" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/样式|CHART_INVALID_STYLE_VARIANT/);
  });
});

import { ChartRenderer } from "@/components/charts/ChartRenderer";

describe("ChartRenderer advanced", () => {
  afterEach(() => cleanup());

  it("T-VIZ-R43-008-03: funnel mock render-spec → data-testid=echarts-chart", async () => {
    mockApiFetch
      .mockResolvedValueOnce({ columns: ["stage", "value"], rows: [["A", 10], ["B", 5]] })
      .mockResolvedValueOnce({
        engine: "echarts",
        chartType: "funnel",
        styleVariant: "default",
        encoding: { dimensions: [{ field: "stage" }], metrics: [{ field: "value" }] },
        source: {},
      });
    const cfg: ChartViewConfig = {
      chartType: "funnel",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT 1",
      dimensions: [{ field: "stage" }],
      metrics: [{ field: "value" }],
    };
    render(<ChartRenderer config={cfg} />);
    expect(await screen.findByTestId("echarts-chart")).toBeInTheDocument();
  });

  it("T-VIZ-R43-005-03: 501 行 → 警告 + 渲染不抛错", async () => {
    const rows = Array.from({ length: 501 }, (_, i) => [`S${i}`, i]);
    mockApiFetch
      .mockResolvedValueOnce({ columns: ["stage", "value"], rows })
      .mockResolvedValueOnce({
        engine: "echarts",
        chartType: "funnel",
        styleVariant: "default",
        encoding: { dimensions: [{ field: "stage" }], metrics: [{ field: "value" }] },
        source: {},
      });
    const cfg: ChartViewConfig = {
      chartType: "funnel",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT 1",
      dimensions: [{ field: "stage" }],
      metrics: [{ field: "value" }],
    };
    render(<ChartRenderer config={cfg} />);
    expect(await screen.findByRole("status")).toHaveTextContent(/500/);
    expect(screen.getByTestId("echarts-chart")).toBeInTheDocument();
  });
});
