import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

import { DASHBOARD_CHART_DND_TYPE, setChartTypeDragData } from "@/lib/dashboardDnd";
import { ApiRequestError } from "@/lib/api";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { WidgetInspectorDelete } from "@/components/dashboard/widget-inspector-delete";
import { gridLayoutToWidgets, normalizeWidgetLayout, widgetsToGridLayout } from "@/components/dashboard/gridLayoutAdapter";
import { snapLayoutToGrid } from "@/components/dashboard/gridSnapUtils";
import { LinkageRulesPanel } from "@/components/dashboard/LinkageRulesPanel";
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

const EMPTY_LINKAGE = { filters: [], linkageRules: [] as { sourceFilterId: string; targetWidgetIds: string[]; parameterKey: string }[] };

function mockGlobalFiltersPath(path: string): typeof EMPTY_LINKAGE | null {
  if (path.includes("/global-filters")) return EMPTY_LINKAGE;
  return null;
}

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  };
});

vi.mock("@/components/charts/ChartRenderer", () => ({
  ChartRenderer: ({ title }: { title?: string }) => <div data-testid="chart-mock">{title}</div>,
}));

function withDs(config: ReturnType<typeof defaultChartConfig>) {
  return {
    ...config,
    dataSourceId: DS_ID,
    mode: "sql" as const,
    sql: "SELECT 1 AS id",
  };
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
          <Route path="/admin/dashboards" element={<div>看板列表页</div>} />
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
    if (path.includes("/api/v1/datasets")) return { items: [] };
    const filters = mockGlobalFiltersPath(path);
    if (filters) return filters;
    if (path.includes("/dashboards/")) {
      return { id: "d1", name: "销售看板", layoutJson: { version: 1, widgets, globalFilters: [] } };
    }
    return {};
  });
}

function renderListPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function widgetSelectTargets() {
  return screen.getAllByTestId("chart-mock").map((el) => {
    const target = el.closest("[role='button']");
    if (!target) throw new Error("widget select target not found");
    return target;
  });
}

describe("dashboard admin smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    resetChartTypeCatalogCache();
  });
  afterEach(() => cleanup());

  it("T-DASH-R28-002-01: empty edit grid shows drop zone guidance", () => {
    render(
      <DashboardGrid
        mode="edit"
        widgets={[]}
        onInsertChart={() => {}}
        onLayoutChange={() => {}}
        renderWidget={() => null}
      />,
    );
    expect(screen.getByText("画布是空的")).toBeInTheDocument();
    expect(document.querySelector(".dashboard-grid-edit .layout")).toBeTruthy();
  });

  it("T-DASH-R28-003-02: palette inserts chart type", async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    render(
      <MemoryRouter>
        <WidgetPalette onInsert={onInsert} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "折线图" }));
    expect(onInsert).toHaveBeenCalledWith("line");
  });

  it("T-DASH-003-04: palette groups catalog by category", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockResolvedValueOnce([
      { type: "table", displayName: "表格", category: "basic", renderer: "table", styleVariants: ["default"], fieldRule: {} },
      { type: "heatmap", displayName: "热力图", category: "geo", renderer: "echarts", styleVariants: ["default"], fieldRule: {} },
    ]);
    const onInsert = vi.fn();
    render(
      <MemoryRouter>
        <WidgetPalette onInsert={onInsert} />
      </MemoryRouter>,
    );
    expect(await screen.findByText("地理")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "热力图" }));
    expect(onInsert).toHaveBeenCalledWith("heatmap");
  });

  it("T-VIZ-PALETTE-03: palette fallback lists pie and gauge", async () => {
    const user = userEvent.setup();
    const onInsert = vi.fn();
    render(
      <MemoryRouter>
        <WidgetPalette onInsert={onInsert} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "饼图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "仪表盘" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "饼图" }));
    expect(onInsert).toHaveBeenCalledWith("pie");
  });

  it("T-VIZ-FC-04: palette links to chart types catalog", () => {
    render(
      <MemoryRouter>
        <WidgetPalette onInsert={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /查看全部类型与字段规则/ })).toHaveAttribute(
      "href",
      "/admin/charts/types",
    );
  });

  it("T-DASH-R28-003-03: delete widget from inspector only", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <WidgetInspectorDelete widgetTitle={sampleWidgets[1].title} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole("button", { name: "删除组件" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("T-DASH-003-01: edit widget card has draggable title bar and header delete", () => {
    const onDelete = vi.fn();
    render(
      <DashboardWidget widget={sampleWidgets[0]} mode="edit" onDelete={onDelete} onTitleChange={() => {}} />,
    );
    expect(document.querySelector(".dashboard-drag-handle")).toBeTruthy();
    expect(screen.getByRole("button", { name: "删除组件" })).toBeInTheDocument();
  });

  it("F-A: edit mode with ready config renders live ChartRenderer, not preview-only text", () => {
    render(
      <DashboardWidget widget={sampleWidgets[0]} mode="edit" onTitleChange={() => {}} />,
    );
    expect(screen.getByTestId("chart-mock")).toBeInTheDocument();
    expect(screen.queryByText("保存布局后可在预览查看出图")).not.toBeInTheDocument();
  });

  it("F-A: edit mode with unready config still shows pending placeholder", () => {
    const widgetNoDs = {
      ...sampleWidgets[0],
      chartConfig: { ...defaultChartConfig("table"), dataSourceId: "" },
    };
    render(<DashboardWidget widget={widgetNoDs} mode="edit" onTitleChange={() => {}} />);
    expect(screen.queryByTestId("chart-mock")).not.toBeInTheDocument();
    expect(screen.getByText("待配置")).toBeInTheDocument();
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

  it("T-DASH-002-02: snapLayoutToGrid snaps width to 12-col grid", () => {
    const layout = widgetsToGridLayout(sampleWidgets);
    const shifted = layout.map((item, i) => (i === 0 ? { ...item, x: 2.4, w: 5.6 } : item));
    const snapped = snapLayoutToGrid(shifted);
    expect(snapped[0].x).toBe(2);
    expect(snapped[0].w).toBe(6);
  });

  it("T-DASH-002-04: shift+click toggles multi-select on edit page", async () => {
    mockDashboardLoad(sampleWidgets);
    renderEditPage();
    await screen.findByText("销售看板");
    const targets = widgetSelectTargets();
    fireEvent.click(targets[0]);
    fireEvent.click(targets[1], { shiftKey: true });
    expect(await screen.findByText("已选中 2 个组件")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除选中 (2)" })).toBeInTheDocument();
  });

  it("T-DASH-002-05: batch delete removes multi-selected widgets", async () => {
    const user = userEvent.setup();
    mockDashboardLoad(sampleWidgets);
    renderEditPage();
    await screen.findByText("销售看板");
    const targets = widgetSelectTargets();
    fireEvent.click(targets[0]);
    fireEvent.click(targets[1], { shiftKey: true });
    await user.click(screen.getByRole("button", { name: "删除选中 (2)" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(await screen.findAllByLabelText("组件标题")).toHaveLength(1);
  });

  it("T-DASH-004-02: linkage rules panel saves via PUT global-filters", async () => {
    const user = userEvent.setup();
    let putBody: Record<string, unknown> | undefined;
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === "/api/v1/datasources") return { items: [{ id: DS_ID, name: "分析库", code: "a" }] };
      if (path.includes("/global-filters") && init?.method === "PUT") {
        putBody = JSON.parse(init.body as string);
        return {
          filters: putBody?.filters,
          linkageRules: putBody?.linkageRules,
          refreshMode: "eager",
          affectedWidgetCount: 1,
        };
      }
      if (path.includes("/global-filters")) {
        return {
          filters: [{ filterId: "f1", dimensionRef: "区域", defaultValue: "华东" }],
          linkageRules: [],
        };
      }
      if (path.includes("/dashboards/")) {
        return { id: "d1", name: "销售看板", layoutJson: { version: 1, widgets: sampleWidgets, globalFilters: [] } };
      }
      return {};
    });
    render(
      <LinkageRulesPanel
        dashboardId="d1"
        linkage={{
          filters: [{ filterId: "f1", dimensionRef: "区域", defaultValue: "华东" }],
          linkageRules: [],
        }}
        widgets={sampleWidgets}
        onSaved={() => {}}
      />,
    );
    await user.click(screen.getByLabelText("源筛选器"));
    await user.click(await screen.findByRole("option", { name: "区域" }));
    await user.type(screen.getByLabelText("参数键 parameterKey"), "region");
    await user.click(screen.getByRole("checkbox", { name: "A" }));
    await user.click(screen.getByRole("button", { name: "添加规则" }));
    await user.click(screen.getByRole("button", { name: "保存联动" }));
    expect(putBody?.linkageRules).toEqual([
      { sourceFilterId: "f1", targetWidgetIds: ["w1"], parameterKey: "region" },
    ]);
  });

  it("T-DASH-004-03: edit page renders linkage rules panel when filters exist", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path === "/api/v1/datasources") return { items: [{ id: DS_ID, name: "分析库", code: "a" }] };
      if (path.includes("/global-filters")) {
        return {
          filters: [{ filterId: "f1", dimensionRef: "区域", defaultValue: "华东" }],
          linkageRules: [],
        };
      }
      if (path.includes("/dashboards/")) {
        return { id: "d1", name: "销售看板", layoutJson: { version: 1, widgets: sampleWidgets.slice(0, 1), globalFilters: [] } };
      }
      return {};
    });
    renderEditPage();
    expect(await screen.findByText("组件联动规则")).toBeInTheDocument();
  });

  it("T-DASH-002-03: normalizeWidgetLayout unpacks overlapping widgets", () => {
    const a = { ...sampleWidgets[0], gridX: 0, gridY: 0, colSpan: 12, rowSpan: 3 };
    const b = { ...sampleWidgets[1], id: "w-overlap", gridX: 0, gridY: 0, colSpan: 12, rowSpan: 3, order: 1 };
    const normalized = normalizeWidgetLayout([a, b]);
    const layout = widgetsToGridLayout(normalized);
    const collides = (x: number, y: number, w: number, h: number, ox: number, oy: number, ow: number, oh: number) =>
      !(x + w <= ox || ox + ow <= x || y + h <= oy || oy + oh <= y);
    expect(collides(layout[0].x, layout[0].y, layout[0].w, layout[0].h, layout[1].x, layout[1].y, layout[1].w, layout[1].h)).toBe(false);
    expect(layout[1].y).toBeGreaterThanOrEqual(layout[0].y + layout[0].h);
  });

  it("T-DASH-R28-002-02: list page empty state", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [], total: 0, limit: 50, offset: 0 });
    renderListPage();
    expect(await screen.findByText("暂无 Dashboard")).toBeInTheDocument();
  });

  it("T-DASH-R28-002-03: edit page loads layout", async () => {
    mockDashboardLoad(sampleWidgets.slice(0, 1));
    renderEditPage();
    expect(await screen.findByText("销售看板")).toBeInTheDocument();
    expect(screen.getByLabelText("组件标题")).toHaveValue("A");
  });

  it("T-DASH-R29-002-04: colSpan 6→12 updates grid column span", () => {
    const widget = { ...sampleWidgets[0], colSpan: 12 };
    const { container } = render(
      <DashboardGrid mode="view" widgets={[widget]} renderWidget={() => <div />} />,
    );
    const cell = container.querySelector("[style*='grid-column']");
    expect(cell).toBeTruthy();
    expect((cell as HTMLElement).style.gridColumn).toBe("span 12");
  });

  it("T-DASH-R29-002-05: illegal layout save shows Chinese error banner", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === "/api/v1/datasources") return { items: [{ id: DS_ID, name: "分析库", code: "a" }] };
      const filters = mockGlobalFiltersPath(path);
      if (filters) return filters;
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
    const titleInput = screen.getByLabelText("组件标题");
    await user.type(titleInput, "!");
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
      const filters = mockGlobalFiltersPath(path);
      if (filters) return filters;
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
      const filters = mockGlobalFiltersPath(path);
      if (filters) return filters;
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
    await screen.findByLabelText("组件标题");
    await user.click(screen.getByText("待配置"));
    await screen.findByLabelText("数据源");
    await user.click(screen.getByLabelText("数据源"));
    await user.click(await screen.findByRole("option", { name: /分析库/ }));
    await user.click(screen.getByRole("tab", { name: "高级 SQL" }));
    const sql = screen.getByLabelText("SQL");
    await user.clear(sql);
    await user.type(sql, "SELECT 2 AS id");
    await user.click(screen.getByRole("button", { name: "保存布局" }));
    expect(putBody?.layoutJson?.widgets?.[0]?.chartConfig?.dataSourceId).toBe(DS_ID);
    expect(putBody?.layoutJson?.widgets?.[0]?.chartConfig?.sql).toBe("SELECT 2 AS id");
  });

  it("T-DASH-R29-003-02: empty edit grid shows drag hint", () => {
    render(
      <DashboardGrid
        mode="edit"
        widgets={[]}
        onInsertChart={() => {}}
        onLayoutChange={() => {}}
        renderWidget={() => null}
      />,
    );
    expect(screen.getByText("画布是空的")).toBeInTheDocument();
    expect(screen.getByText(/从左侧拖拽或点击图表类型/)).toBeInTheDocument();
  });

  it("T-DASH-004-01: palette row sets chart drag payload", () => {
    const store = new Map<string, string>();
    const dt = {
      get types() {
        return [...store.keys()];
      },
      setData(type: string, value: string) {
        store.set(type, value);
      },
      getData(type: string) {
        return store.get(type) ?? "";
      },
      effectAllowed: "",
    } as unknown as DataTransfer;
    setChartTypeDragData(dt, "table");
    expect(dt.types).toContain(DASHBOARD_CHART_DND_TYPE);
    expect(dt.getData(DASHBOARD_CHART_DND_TYPE)).toBe("table");
  });

  it("T-DASH-R29-003-05: delete middle widget reorders without error", () => {
    const remaining = sampleWidgets.filter((w) => w.id !== "w2");
    const sorted = sortWidgets(remaining);
    expect(sorted.map((w) => w.id)).toEqual(["w1", "w3"]);
  });

  it("T-DASH-DELETE-01: delete dashboard navigates to list (no zombie edit)", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === "/api/v1/datasources") return { items: [] };
      const filters = mockGlobalFiltersPath(path);
      if (filters) return filters;
      if (init?.method === "DELETE") return undefined;
      return {
        id: "d1",
        name: "待删看板",
        layoutJson: { version: 1, widgets: sampleWidgets.slice(0, 1), globalFilters: [] },
      };
    });
    renderEditPage();
    expect(await screen.findByText("待删看板")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除看板" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(await screen.findByText("看板列表页")).toBeInTheDocument();
  });

  it("T-DASH-DELETE-02: missing dashboard shows empty state instead of zombie canvas", async () => {
    mockApiFetch.mockImplementation(async () => {
      throw new ApiRequestError("Dashboard not found", "DASH_NOT_FOUND");
    });
    renderEditPage();
    expect(await screen.findByText("看板不存在或已被删除")).toBeInTheDocument();
    expect(screen.queryByText("画布")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回看板列表" })).toBeInTheDocument();
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
    renderListPage();
    expect(await screen.findByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByText("C")).not.toBeInTheDocument();
  });

  it("F-C: undo restores previous widget layout after adding widget", async () => {
    const user = userEvent.setup();
    mockDashboardLoad(sampleWidgets.slice(0, 1));
    renderEditPage();
    await screen.findByLabelText("组件标题");
    expect(screen.getAllByLabelText("组件标题")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "折线图" }));
    expect(await screen.findAllByLabelText("组件标题")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "撤销" }));
    expect(screen.getAllByLabelText("组件标题")).toHaveLength(1);
  });

  it("F-D: edit mode loads global filters and renders filter bar", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path === "/api/v1/datasources") return { items: [{ id: DS_ID, name: "分析库", code: "a" }] };
      if (path.includes("/global-filters")) {
        return {
          filters: [{ filterId: "f1", dimensionRef: "区域", defaultValue: "华东" }],
          linkageRules: [],
        };
      }
      if (path.includes("/dashboards/")) {
        return { id: "d1", name: "销售看板", layoutJson: { version: 1, widgets: sampleWidgets.slice(0, 1), globalFilters: [] } };
      }
      return {};
    });
    renderEditPage();
    expect(await screen.findByLabelText("区域")).toBeInTheDocument();
    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/dashboards/d1/global-filters");
  });
});
