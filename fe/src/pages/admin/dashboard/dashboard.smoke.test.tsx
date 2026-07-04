import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import {
  defaultChartConfig,
  moveWidget,
  sortWidgets,
  type LayoutWidget,
} from "@/components/dashboard/layoutUtils";
import { WidgetPalette } from "@/components/dashboard/WidgetPalette";
import { DashboardEditPage } from "./DashboardEditPage";
import { DashboardListPage } from "./DashboardListPage";

const mockApiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/components/charts/ChartRenderer", () => ({
  ChartRenderer: ({ title }: { title?: string }) => <div data-testid="chart-mock">{title}</div>,
}));

const sampleWidgets: LayoutWidget[] = [
  {
    id: "w1",
    type: "chart",
    title: "A",
    colSpan: 6,
    rowSpan: 1,
    order: 0,
    chartConfig: defaultChartConfig("table"),
  },
  {
    id: "w2",
    type: "chart",
    title: "B",
    colSpan: 6,
    rowSpan: 1,
    order: 1,
    chartConfig: defaultChartConfig("line"),
  },
  {
    id: "w3",
    type: "chart",
    title: "C",
    colSpan: 6,
    rowSpan: 1,
    order: 2,
    chartConfig: defaultChartConfig("bar"),
  },
];

describe("dashboard admin smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
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
    mockApiFetch.mockResolvedValueOnce({
      id: "d1",
      name: "销售看板",
      layoutJson: { version: 1, widgets: sampleWidgets.slice(0, 1), globalFilters: [] },
    });
    render(
      <MemoryRouter initialEntries={["/admin/dashboards/d1/edit"]}>
        <Routes>
          <Route path="/admin/dashboards/:id/edit" element={<DashboardEditPage mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("销售看板")).toBeInTheDocument();
    expect(screen.getByLabelText("组件标题")).toHaveValue("A");
  });

  it("T-DASH-R29-002-04: colSpan 6→12 updates grid class", () => {
    const widget = { ...sampleWidgets[0], colSpan: 12 as const };
    const { container } = render(
      <DashboardGrid mode="edit" widgets={[widget]} renderWidget={() => <div />} />,
    );
    expect(container.querySelector(".xl\\:col-span-12")).toBeTruthy();
  });

  it("T-DASH-R29-002-05: illegal layout save shows Chinese error banner", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce({
        id: "d1",
        name: "X",
        layoutJson: { version: 1, widgets: sampleWidgets.slice(0, 1), globalFilters: [] },
      })
      .mockRejectedValueOnce(
        Object.assign(new Error("组件 ID 重复"), { code: "DASH_DUPLICATE_WIDGET" }),
      );
    render(
      <MemoryRouter initialEntries={["/admin/dashboards/d1/edit"]}>
        <Routes>
          <Route path="/admin/dashboards/:id/edit" element={<DashboardEditPage mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("X");
    await user.click(screen.getByRole("button", { name: "保存布局" }));
    expect(await screen.findByText("组件 ID 重复")).toBeInTheDocument();
  });

  it("T-DASH-R29-003-01: title change reflected in save payload", async () => {
    const user = userEvent.setup();
    let putBody: { layoutJson?: { widgets?: { title: string }[] } } | undefined;
    mockApiFetch
      .mockResolvedValueOnce({
        id: "d1",
        name: "编辑",
        layoutJson: { version: 1, widgets: sampleWidgets.slice(0, 1), globalFilters: [] },
      })
      .mockImplementationOnce(async (_path, init) => {
        putBody = JSON.parse((init as RequestInit).body as string);
        return { layoutJson: putBody?.layoutJson };
      });
    render(
      <MemoryRouter initialEntries={["/admin/dashboards/d1/edit"]}>
        <Routes>
          <Route path="/admin/dashboards/:id/edit" element={<DashboardEditPage mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByLabelText("组件标题");
    const titleInput = screen.getByLabelText("组件标题");
    await user.clear(titleInput);
    await user.type(titleInput, "新标题");
    await user.click(screen.getByRole("button", { name: "保存布局" }));
    expect(putBody?.layoutJson?.widgets?.[0]?.title).toBe("新标题");
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
