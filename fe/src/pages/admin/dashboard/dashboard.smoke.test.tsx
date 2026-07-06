import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", roles: ["admin"] },
    isLoading: false,
    isAuthenticated: true,
    logout: vi.fn(),
    refresh: vi.fn(async () => {}),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { gridLayoutToWidgets, widgetsToGridLayout } from "@/components/dashboard/gridLayoutAdapter";
import {
  defaultChartConfig,
  moveWidget,
  sortWidgets,
  type LayoutWidget,
} from "@/components/dashboard/layoutUtils";
import { WidgetPalette } from "@/components/dashboard/WidgetPalette";
import { resetChartTypeCatalogCache } from "@/lib/chartRegistry";
import { DashboardEditPage } from "./DashboardEditPage";
import { DashboardListPage } from "./DashboardListPage";

const mockApiFetch = vi.fn();
const DS_ID = "00000000-0000-4000-8000-000000000010";

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/components/charts/ChartRenderer", () => ({
  ChartRenderer: ({ title }: { title?: string }) => <div data-testid="chart-mock">{title}</div>,
}));

function withDs(config: ReturnType<typeof defaultChartConfig>) {
  return { ...config, dataSourceId: DS_ID };
}

const sampleWidgets: LayoutWidget[] = [
  {
    id: "w1",
    type: "chart",
    title: "A",
    colSpan: 6,
    rowSpan: 1,
    order: 0,
    chartConfig: withDs(defaultChartConfig("table")),
  },
  {
    id: "w2",
    type: "chart",
    title: "B",
    colSpan: 6,
    rowSpan: 1,
    order: 1,
    chartConfig: withDs(defaultChartConfig("line")),
  },
  {
    id: "w3",
    type: "chart",
    title: "C",
    colSpan: 6,
    rowSpan: 1,
    order: 2,
    chartConfig: withDs(defaultChartConfig("bar")),
  },
];

function renderEditPage(path = "/admin/dashboards/d1/edit") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/dashboards/:id/edit" element={<DashboardEditPage mode="edit" />} />
          <Route path="/admin/dashboards/:id" element={<DashboardEditPage mode="view" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockDashboardLoad(widgets: LayoutWidget[]) {
  mockApiFetch.mockImplementation(async (...args: unknown[]) => {
    const path = String(args[0] ?? "");
    if (path === "/api/v1/datasources") return { items: [{ id: DS_ID, name: "分析库", code: "a" }] };
    if (path.includes("/dashboards/")) {
      return { id: "d1", name: "销售看板", layoutJson: { version: 1, widgets, globalFilters: [] } };
    }
    return {};
  });
}

describe("dashboard admin smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    resetChartTypeCatalogCache();
  });
  afterEach(() => cleanup());

  it("T-DASH-R28-002-01: empty grid shows guidance", () => {
    render(
      <DashboardGrid mode="edit" widgets={[]} onAddWidget={() => {}} renderWidget={() => null} />,
    );
    expect(screen.getByText("仪表板还没有组件")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加组件" })).toBeInTheDocument();
  });

  it("T-DASH-R28-003-02: palette inserts chart type", async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    render(<WidgetPalette onInsert={onInsert} />);
    await user.click(screen.getByRole("button", { name: "折线图" }));
    expect(onInsert).toHaveBeenCalledWith("line");
  });

  it("T-DASH-003-04: palette shows extended group", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce([
      { type: "table", displayName: "表格", category: "basic", renderer: "table", styleVariants: ["default"], fieldRule: {} },
      { type: "heatmap", displayName: "热力图", category: "geo", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
    ]);
    const onInsert = vi.fn();
    render(<WidgetPalette onInsert={onInsert} />);
    expect(await screen.findByText("扩展组件")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "热力图" }));
    expect(onInsert).toHaveBeenCalledWith("heatmap");
  });

  it("T-DASH-R28-003-03: delete middle widget", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <DashboardWidget
        widget={sampleWidgets[1]}
        mode="edit"
        onDelete={onDelete}
        onMove={() => {}}
        onResize={() => {}}
        onTitleChange={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "删除组件" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(onDelete).toHaveBeenCalledWith("w2");
  });

  it("T-DASH-R28-003-04: layoutUtils sortWidgets round-trip", () => {
    const shuffled = [sampleWidgets[2], sampleWidgets[0], sampleWidgets[1]];
    const sorted = sortWidgets(shuffled);
    expect(sorted.map((w) => w.id)).toEqual(["w1", "w2", "w3"]);
    const moved = moveWidget(sorted, "w2", "up");
    expect(sortWidgets(moved).map((w) => w.id)).toEqual(["w2", "w1", "w3"]);
  });

  it("T-DASH-002-01: gridLayoutAdapter round-trip order", () => {
    const layout = widgetsToGridLayout(sampleWidgets);
    const next = gridLayoutToWidgets(layout, sampleWidgets);
    expect(next.map((w) => w.id)).toEqual(["w1", "w2", "w3"]);
  });

  it("T-DASH-R28-002-02: list page empty state", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter>
        <DashboardListPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("暂无 Dashboard")).toBeInTheDocument();
  });

  it("T-DASH-R28-002-03: edit page loads layout", async () => {
    mockDashboardLoad(sampleWidgets.slice(0, 1));
    renderEditPage();
    expect(await screen.findByText("销售看板")).toBeInTheDocument();
    expect(screen.getByLabelText("组件标题")).toHaveValue("A");
  });

  it("T-DASH-R29-002-04: colSpan 6→12 updates grid class", () => {
    const widget = { ...sampleWidgets[0], colSpan: 12 as const };
    const { container } = render(
      <DashboardGrid mode="view" widgets={[widget]} renderWidget={() => <div />} />,
    );
    expect(container.querySelector(".xl\\:col-span-12")).toBeTruthy();
  });

  it("T-DASH-R29-002-05: illegal layout save shows Chinese error banner", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === "/api/v1/datasources") return { items: [{ id: DS_ID, name: "分析库", code: "a" }] };
      if (init?.method === "PUT") {
        throw Object.assign(new Error("组件 ID 重复"), { code: "DASH_DUPLICATE_WIDGET" });
      }
      return {
        id: "d1",
        name: "X",
        layoutJson: { version: 1, widgets: sampleWidgets.slice(0, 1), globalFilters: [] },
      };
    });
    renderEditPage();
    await screen.findByText("X");
    await user.click(screen.getByRole("button", { name: "保存布局" }));
    expect(await screen.findByText("组件 ID 重复")).toBeInTheDocument();
  });

  it("T-DASH-R29-003-01: title change reflected in save payload", async () => {
    const user = userEvent.setup();
    let putBody: { layoutJson?: { widgets?: { title: string }[] } } | undefined;
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === "/api/v1/datasources") return { items: [{ id: DS_ID, name: "分析库", code: "a" }] };
      if (init?.method === "PUT") {
        putBody = JSON.parse(init.body as string);
        return { layoutJson: putBody?.layoutJson };
      }
      return {
        id: "d1",
        name: "编辑",
        layoutJson: { version: 1, widgets: sampleWidgets.slice(0, 1), globalFilters: [] },
      };
    });
    renderEditPage();
    await screen.findByLabelText("组件标题");
    const titleInput = screen.getByLabelText("组件标题");
    await user.clear(titleInput);
    await user.type(titleInput, "新标题");
    await user.click(screen.getByRole("button", { name: "保存布局" }));
    expect(putBody?.layoutJson?.widgets?.[0]?.title).toBe("新标题");
  });

  it("T-VIZ-002-01: save layout includes edited dataSourceId and sql", async () => {
    const user = userEvent.setup();
    let putBody: {
      layoutJson?: { widgets?: { chartConfig?: { dataSourceId?: string; sql?: string } }[] };
    } | undefined;
    const widgetNoDs = {
      ...sampleWidgets[0],
      chartConfig: { ...defaultChartConfig("table"), dataSourceId: "" },
    };
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === "/api/v1/datasources") return { items: [{ id: DS_ID, name: "分析库", code: "a" }] };
      if (init?.method === "PUT") {
        putBody = JSON.parse(init.body as string);
        return {};
      }
      return {
        id: "d1",
        name: "编辑",
        layoutJson: { version: 1, widgets: [widgetNoDs], globalFilters: [] },
      };
    });
    renderEditPage();
    await screen.findByLabelText("数据源");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /分析库/ }));
    const sql = screen.getByLabelText("SQL");
    await user.clear(sql);
    await user.type(sql, "SELECT 2 AS id");
    await user.click(screen.getByRole("button", { name: "保存布局" }));
    expect(putBody?.layoutJson?.widgets?.[0]?.chartConfig?.dataSourceId).toBe(DS_ID);
    expect(putBody?.layoutJson?.widgets?.[0]?.chartConfig?.sql).toBe("SELECT 2 AS id");
  });

  it("T-DASH-R29-003-02: empty grid shows enhanced guidance", () => {
    render(
      <DashboardGrid mode="edit" widgets={[]} onAddWidget={() => {}} renderWidget={() => null} />,
    );
    expect(screen.getByText("仪表板还没有组件")).toBeInTheDocument();
    expect(screen.getByText(/从左侧添加/)).toBeInTheDocument();
  });

  it("T-DASH-R29-003-05: delete middle widget reorders without error", () => {
    const remaining = sampleWidgets.filter((w) => w.id !== "w2");
    const sorted = sortWidgets(remaining);
    expect(sorted.map((w) => w.id)).toEqual(["w1", "w3"]);
  });

  it("T-DASH-R29-001-05: list page renders paginated row count", async () => {
    mockApiFetch.mockResolvedValueOnce({
      items: [
        { id: "1", name: "A", slug: "a", updatedAt: "2026-01-01" },
        { id: "2", name: "B", slug: "b", updatedAt: "2026-01-02" },
      ],
      total: 5,
      limit: 2,
      offset: 0,
    });
    render(
      <MemoryRouter>
        <DashboardListPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByText("C")).not.toBeInTheDocument();
  });
});
