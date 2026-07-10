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
      expect(screen.getByText("销售额")).toBeInTheDocument();
    });
    expect(screen.getByText(/\/embed\/chart\/w1/)).toBeInTheDocument();
    expect(screen.queryByText("该看板暂无组件，请先添加图表。")).not.toBeInTheDocument();
  });
});
