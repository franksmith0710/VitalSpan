import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
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

import { EntityOverviewPage } from "./EntityOverviewPage";

function renderOverview() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EntityOverviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EntityOverviewPage smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/metadata/entity-types") {
        return {
          items: [{ typeCode: "order", displayName: "订单", attributes: [], lifecycleStates: [] }],
        };
      }
      if (path.includes("physical-tables")) {
        return {
          items: [
            {
              tableFqn: "sales.orders",
              displayName: "订单表",
              dataSourceId: "00000000-0000-4000-8000-000000000010",
              columns: [],
            },
          ],
          total: 1,
        };
      }
      if (path.startsWith("/api/v1/dashboards") && !path.includes("entity-overview")) {
        return { items: [{ id: "d1", name: "销售看板" }] };
      }
      if (path.includes("entity-overview")) {
        return {
          dashboardId: "d1",
          entityTypeRef: "order",
          statCards: [{ metricKey: "count", label: "实体数" }],
          filters: [],
          drillTargets: [{ widgetId: "w1", targetDashboardId: "d2" }],
        };
      }
      return {};
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("T-DASH-005-01: renders tabs and table with mock APIs", async () => {
    renderOverview();
    expect(await screen.findByText("实体总览")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "订单" })).toBeInTheDocument();
    expect(await screen.findByText("订单表")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "下钻" })).toBeInTheDocument();
  });

  it("T-DASH-005-02: empty entity types state", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/metadata/entity-types") return { items: [] };
      return { items: [] };
    });
    renderOverview();
    expect(await screen.findByText("请先配置实体类型")).toBeInTheDocument();
  });

  it("T-DASH-005-03: error state with retry", async () => {
    const { ApiRequestError } = await import("@/lib/api");
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/metadata/entity-types") {
        throw new ApiRequestError("加载失败", "NETWORK_ERROR");
      }
      return { items: [] };
    });
    renderOverview();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
    });
  });
});
