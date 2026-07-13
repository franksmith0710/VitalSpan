import { cleanup, render, screen, waitFor } from "@testing-library/react";
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

const mockApiFetch = vi.fn();

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

import { DashboardSharePage } from "./DashboardSharePage";

afterEach(() => {
  cleanup();
  mockApiFetch.mockReset();
});

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe("DashboardSharePage", () => {
  it("P0-01: reads layoutJson.widgets and lists embed links", async () => {
    mockApiFetch.mockResolvedValue({
      id: "d1",
      name: "销售看板",
      layoutJson: {
        version: 1,
        widgets: [
          {
            id: "w1",
            type: "chart",
            title: "销售额",
            colSpan: 6,
            rowSpan: 2,
            order: 0,
            chartConfig: {
              chartType: "bar",
              chartId: "w1",
              dataSourceId: "00000000-0000-4000-8000-000000000010",
              mode: "sql",
              sql: "SELECT 1",
            },
          },
        ],
        globalFilters: [],
      },
    });

    render(
      <MemoryRouter initialEntries={["/admin/dashboards/d1/share"]}>
        <Routes>
          <Route path="/admin/dashboards/:id/share" element={<DashboardSharePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("销售额").length).toBeGreaterThanOrEqual(2);
    });
    expect(screen.getByText(/\/embed\/chart\/w1/)).toBeInTheDocument();
    expect(screen.queryByText("该看板暂无组件，请先添加图表。")).not.toBeInTheDocument();
    expect(document.querySelector(".dashboard-grid-view")).toBeTruthy();
  });

  it("B3: renders a v2 layout with the read-only pixel engine", async () => {
    mockApiFetch.mockResolvedValue({
      id: "d2",
      name: "像素分享",
      layoutJson: {
        version: 2,
        canvas: { width: 1440, height: 900 },
        widgets: [
          {
            id: "w2",
            type: "chart",
            title: "像素图表",
            order: 5,
            x: 120,
            y: 80,
            width: 480,
            height: 320,
            chartConfig: {
              chartType: "bar",
              chartId: "w2",
              dataSourceId: "00000000-0000-4000-8000-000000000010",
              mode: "sql",
              sql: "SELECT 1",
            },
          },
        ],
        globalFilters: [],
      },
    });

    render(
      <MemoryRouter initialEntries={["/admin/dashboards/d2/share"]}>
        <Routes>
          <Route path="/admin/dashboards/:id/share" element={<DashboardSharePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("pixel-canvas-host")).toBeInTheDocument();
    expect(screen.queryByTestId("pixel-edit-bar-w2")).not.toBeInTheDocument();
    expect(screen.getByText(/\/embed\/chart\/w2/)).toBeInTheDocument();
  });
});
