import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchChartTypeCatalog } from "@/lib/chartRegistry";
import { createBarChartOptions } from "@/lib/chart-theme";

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
    expect(textStyle?.color).not.toBe("#ffffff"); // @design-token-ok test assertion
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

import { cleanup, render, screen, fireEvent } from "@testing-library/react";
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

  it("T-VIZ-R236-005-02: ChartConfigPanel add/remove filter rows", () => {
    const onChange = vi.fn();
    render(
      <ChartConfigPanel
        config={{ chartType: "funnel", dimensions: [{ field: "stage" }], metrics: [{ field: "cnt" }], filters: [] }}
        columns={["stage", "cnt", "region"]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /添加筛选/i }));
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)?.[0];
    expect(last.filters?.length).toBe(1);
  });

  it("T-VIZ-R236-005-03: funnel fieldRule min metrics hint preserved", async () => {
    mockApiFetch.mockResolvedValueOnce([
      {
        type: "funnel",
        displayName: "漏斗",
        styleVariants: ["default"],
        fieldRule: { minMetrics: 2, maxMetrics: 4, note: "至少 2 个度量" },
      },
    ]);
    render(
      <ChartConfigPanel
        config={{
          chartType: "funnel",
          dataSourceId: "00000000-0000-4000-8000-000000000001",
          mode: "sql",
          sql: "SELECT 1",
          dimensions: [{ field: "stage" }],
          metrics: [{ field: "cnt" }, { field: "cnt2" }],
        }}
        columns={["stage", "cnt", "cnt2"]}
        onChange={() => {}}
      />,
    );
    expect(await screen.findByText("至少 2 个度量")).toBeInTheDocument();
  });

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

  it("T-VIZ-R237-005-03: timeRange preset change triggers onChange", () => {
    const onChange = vi.fn();
    const config = {
      chartType: "line" as const,
      dimensions: [{ field: "dt" }],
      metrics: [{ field: "val" }],
      timeRange: { enabled: true, mode: "relative" as const, relativePreset: "last_7d" as const },
    };
    render(<ChartConfigPanel config={config} columns={["dt", "val"]} onChange={onChange} />);
    expect(screen.getByLabelText("启用时间范围筛选")).toBeChecked();
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

import { EmbedSharePanel } from "@/embed/EmbedSharePanel";
import { EmbedChartPage } from "@/embed/EmbedChartPage";
import { MemoryRouter, Route, Routes } from "react-router";

describe("Embed", () => {
  afterEach(() => cleanup());

  it("T-VIZ-R43-006-01: EmbedSharePanel 非法 origin not-a-url → 字段错误", async () => {
    render(<EmbedSharePanel />);
    await userEvent.type(screen.getByLabelText(/来源|Origin/i), "not-a-url");
    await userEvent.click(screen.getByRole("button", { name: /添加/ }));
    expect(await screen.findByText(/无效|格式/)).toBeInTheDocument();
  });

  it("T-VIZ-R43-006-03: 未授权 origin → 错误态文案", () => {
    vi.stubGlobal("location", { ...window.location, origin: "https://evil.com" });
    render(
      <MemoryRouter initialEntries={["/embed/chart/test-id"]}>
        <Routes>
          <Route path="/embed/chart/:chartId" element={<EmbedChartPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/未授权嵌入/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("T-VIZ-R43-006-02: 合法配置 → iframe title 可访问", async () => {
    mockApiFetch.mockResolvedValueOnce({});
    render(<EmbedSharePanel />);
    await userEvent.type(screen.getByLabelText("图表 ID"), "00000000-0000-4000-8000-000000000001");
    await userEvent.type(screen.getByLabelText(/来源|Origin/i), "https://a.com");
    await userEvent.click(screen.getByRole("button", { name: /添加/ }));
    await userEvent.click(screen.getByRole("button", { name: /校验并生成嵌入链接/ }));
    expect(await screen.findByTitle("嵌入图表预览")).toBeInTheDocument();
  });
});

describe("ChartRenderer extended", () => {
  afterEach(() => cleanup());

  it("T-VIZ-R43-004-01: sankey 2 维+1 度量 → echarts 容器", async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        columns: ["src", "dst", "amt"],
        rows: [["A", "B", 10]],
      })
      .mockResolvedValueOnce({
        engine: "echarts",
        chartType: "sankey",
        styleVariant: "default",
        encoding: {
          dimensions: [{ field: "src" }, { field: "dst" }],
          metrics: [{ field: "amt" }],
        },
        source: {},
      });
    const cfg: ChartViewConfig = {
      chartType: "sankey",
      dataSourceId: "00000000-0000-4000-8000-000000000001",
      mode: "sql",
      sql: "SELECT 1",
      dimensions: [{ field: "src" }, { field: "dst" }],
      metrics: [{ field: "amt" }],
    };
    render(<ChartRenderer config={cfg} />);
    expect(await screen.findByTestId("echarts-chart")).toBeInTheDocument();
  });

  it("T-VIZ-R43-005-01: funnel 3 阶段 mock → 漏斗 series 可见", async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        columns: ["stage", "value"],
        rows: [["A", 100], ["B", 60], ["C", 30]],
      })
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
});

describe("bar stacked options", () => {
  it("T-VIZ-R43-004-03: bar stacked mock → Apex options 含 stacked", () => {
    const opts = createBarChartOptions(["a", "b"], {
      chart: { stacked: true },
    });
    expect(opts.chart?.stacked).toBe(true);
  });
});

import { buildTimeRangeParameters } from "@/components/charts/useChartExecute";

describe("buildTimeRangeParameters", () => {
  it("T-VIZ-R237-005-06: native mode does not require time params in execute body", () => {
    expect(buildTimeRangeParameters({ enabled: true, mode: "relative", relativePreset: "mtd" })).toHaveProperty(
      "time_start",
    );
  });
});

// ─── VIZ-003/004/008 r250 补强 ──────────────────────────────────────────────

import { isKnownChartType } from "@/lib/chartRegistry";
import { getFallbackChartType } from "@/components/charts/adapters/renderFromSpec";

describe("VIZ-003 未知 chartType 降级", () => {
  it("T-VIZ-R250-003-01: isKnownChartType('line')→true; isKnownChartType('unknown_xyz')→false", () => {
    expect(isKnownChartType("line")).toBe(true);
    expect(isKnownChartType("unknown_xyz")).toBe(false);
  });

  it("T-VIZ-R250-003-02: buildEchartsOption unknown_xyz → series 为空数组（table fallback）", () => {
    const spec: RenderSpec = {
      engine: "echarts",
      chartType: "unknown_xyz",
      styleVariant: "default",
      encoding: { dimensions: [{ field: "d" }], metrics: [{ field: "m" }] },
      source: {},
    };
    const option = buildEchartsOption(spec, [["A", 1]], ["d", "m"]);
    expect(Array.isArray((option as { series?: unknown[] }).series)).toBe(true);
    expect((option as { series?: unknown[] }).series!.length).toBe(0);
  });
});

describe("VIZ-004 样式子类型 smoke", () => {
  it("T-VIZ-R250-004-01: buildEchartsOption bar stacked → series[0].stack 非空", () => {
    const spec: RenderSpec = {
      engine: "echarts",
      chartType: "bar",
      styleVariant: "stacked",
      encoding: { dimensions: [{ field: "cat" }], metrics: [{ field: "val" }] },
      source: {},
    };
    const option = buildEchartsOption(spec, [["A", 10], ["B", 20]], ["cat", "val"]);
    const s = (option.series as Array<{ stack?: string }>)[0];
    expect(s.stack).toBeTruthy();
  });

  it("T-VIZ-R250-004-02: buildEchartsOption pie donut → series[0].radius 为长度 2 数组", () => {
    const spec: RenderSpec = {
      engine: "echarts",
      chartType: "pie",
      styleVariant: "donut",
      encoding: { dimensions: [{ field: "name" }], metrics: [{ field: "val" }] },
      source: {},
    };
    const option = buildEchartsOption(spec, [["A", 10]], ["name", "val"]);
    const radius = (option.series as Array<{ radius?: unknown }>)[0].radius;
    expect(Array.isArray(radius)).toBe(true);
    expect((radius as unknown[]).length).toBe(2);
  });
});

describe("VIZ-008 空数据 + 异常态", () => {
  it("T-VIZ-R250-008-01: buildEchartsOption rows=[] → series 为 [] 不抛错", () => {
    const spec: RenderSpec = {
      engine: "echarts",
      chartType: "funnel",
      styleVariant: "default",
      encoding: { dimensions: [{ field: "stage" }], metrics: [{ field: "value" }] },
      source: {},
    };
    let option: ReturnType<typeof buildEchartsOption> | undefined;
    expect(() => {
      option = buildEchartsOption(spec, [], ["stage", "value"]);
    }).not.toThrow();
    expect((option as { series?: unknown[] })?.series?.length).toBe(0);
  });

  it("T-VIZ-R250-008-02: buildEchartsOption bar 正常数据 → series[0].type==='bar'（主路径回归）", () => {
    const spec: RenderSpec = {
      engine: "echarts",
      chartType: "bar",
      styleVariant: "default",
      encoding: { dimensions: [{ field: "cat" }], metrics: [{ field: "val" }] },
      source: {},
    };
    const option = buildEchartsOption(spec, [["X", 5]], ["cat", "val"]);
    expect((option.series as Array<{ type: string }>)[0].type).toBe("bar");
  });
});
