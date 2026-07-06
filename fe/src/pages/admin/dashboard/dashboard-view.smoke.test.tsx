import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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
const DS_ID = "00000000-0000-4000-8000-000000000010";

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("react-apexcharts", () => ({
  default: () => <div data-testid="apex-chart-container" />,
}));

import { defaultChartConfig, type LayoutWidget } from "@/components/dashboard/layoutUtils";
import { DashboardEditPage } from "./DashboardEditPage";

const viewWidget: LayoutWidget = {
  id: "w1",
  type: "chart",
  title: "表",
  colSpan: 6,
  rowSpan: 1,
  order: 0,
  chartConfig: {
    ...defaultChartConfig("table"),
    dataSourceId: DS_ID,
  },
};

describe("dashboard view mode chart render", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it("T-VIZ-002-02: view mode renders table headers from ChartRenderer", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.includes("/query/execute")) return { columns: ["id"], rows: [[1]] };
      return {
        id: "d1",
        name: "预览",
        layoutJson: { version: 1, widgets: [viewWidget], globalFilters: [] },
      };
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/dashboards/d1"]}>
          <Routes>
            <Route path="/admin/dashboards/:id" element={<DashboardEditPage mode="view" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("id")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
