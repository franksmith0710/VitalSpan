import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApiFetch = vi.fn();

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

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  };
});

import { PrefabReportsPage } from "./PrefabReportsPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PrefabReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PrefabReportsPage smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/reports/prefab/bindings") {
        return {
          items: [
            {
              bindingKey: "prefab-entity-lifecycle",
              displayName: "实体生命周期分布",
              analysisType: "lifecycle",
              entityTypeCode: "equipment",
              dimensionCodes: ["status"],
            },
          ],
          total: 1,
        };
      }
      if (path.includes("/run") && init?.method === "POST") {
        return {
          bindingKey: "prefab-entity-lifecycle",
          analysisType: "lifecycle",
          dataSourceId: "00000000-0000-4000-8000-000000000001",
          status: "ready",
          renderSpec: {
            sections: [{ kind: "table", columns: ["status", "cnt"], rows: [["active", 3]], placeholder: false }],
          },
        };
      }
      return { items: [], total: 0 };
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders binding list from API", async () => {
    renderPage();
    expect(await screen.findByText("实体生命周期分布")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "运行报表 实体生命周期分布" })).toBeInTheDocument();
  });

  it("shows empty state when total=0", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/reports/prefab/bindings") return { items: [], total: 0 };
      return {};
    });
    renderPage();
    expect(await screen.findByText("暂无预制报表")).toBeInTheDocument();
    expect(screen.getByText(/请联系管理员添加实体与分析类型绑定/)).toBeInTheDocument();
    expect(screen.getByText("报表列表")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "暂无预制报表" })).toBeInTheDocument();
    expect(screen.queryByText("运行结果")).not.toBeInTheDocument();
  });

  it("run success displays table headers", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "运行报表 实体生命周期分布" }));
    expect(await screen.findByText("status")).toBeInTheDocument();
    expect(screen.getByText("cnt")).toBeInTheDocument();
  });

  it("viewer sees forbidden message on run error", async () => {
    vi.resetModules();
    vi.doMock("@/context/auth-context", () => ({
      useAuth: () => ({
        user: { id: "v1", username: "viewer", roles: ["viewer"] },
        isLoading: false,
        isAuthenticated: true,
        logout: vi.fn(),
        refresh: vi.fn(async () => {}),
      }),
      AuthProvider: ({ children }: { children: React.ReactNode }) => children,
    }));
    const { PrefabReportsPage: ViewerPage } = await import("./PrefabReportsPage");
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <ViewerPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByText("无权运行预制报表")).toBeInTheDocument();
    });
  });
});
