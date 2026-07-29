import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

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

function renderSharePage(initialEntry: string, routePath: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path={routePath} element={<DashboardSharePage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

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

    renderSharePage("/admin/dashboards/d1/share", "/admin/dashboards/:id/share");

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

    renderSharePage("/admin/dashboards/d2/share", "/admin/dashboards/:id/share");

    expect(await screen.findByTestId("pixel-canvas-host")).toBeInTheDocument();
    expect(screen.queryByTestId("pixel-drag-edge-top-w2")).not.toBeInTheDocument();
    expect(screen.getByText(/\/embed\/chart\/w2/)).toBeInTheDocument();
  });

  it("A2: renders data-screen share route with read-only pixel canvas", async () => {
    mockApiFetch.mockResolvedValue({
      id: "ds1",
      name: "运营大屏",
      layoutJson: {
        version: 2,
        canvas: { width: 1920, height: 1080 },
        widgets: [
          {
            id: "w-ds1",
            type: "chart",
            title: "核心指标",
            order: 0,
            x: 80,
            y: 60,
            width: 400,
            height: 280,
            chartConfig: {
              chartType: "bar",
              chartId: "w-ds1",
              dataSourceId: "00000000-0000-4000-8000-000000000010",
              mode: "sql",
              sql: "SELECT 1",
            },
          },
        ],
        globalFilters: [],
        styleConfig: { surfaceKind: "data-screen", colorScheme: "dark" },
      },
    });

    renderSharePage("/admin/data-screens/ds1/share", "/admin/data-screens/:id/share");

    expect(await screen.findByTestId("pixel-canvas-host")).toBeInTheDocument();
    expect(screen.queryByTestId("pixel-drag-edge-top-w-ds1")).not.toBeInTheDocument();
    expect(screen.getByText(/\/embed\/chart\/w-ds1/)).toBeInTheDocument();
  });
});
