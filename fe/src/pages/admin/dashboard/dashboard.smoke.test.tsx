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
    expect(screen.getByText("暂无组件")).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { level: 4, name: "A" })).toBeInTheDocument();
  });
});
