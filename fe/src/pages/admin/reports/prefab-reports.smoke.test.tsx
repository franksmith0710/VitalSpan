import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockApiFetch = vi.fn();

const authState = {
  user: { id: "1", username: "admin", roles: ["admin"] as string[] },
};

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: authState.user,
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

function renderPage(initialEntry = "/admin/reports") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/admin/reports" element={<PrefabReportsPage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("PrefabReportsPage smoke", () => {
  beforeEach(() => {
    authState.user = { id: "1", username: "admin", roles: ["admin"] };
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
    expect(screen.getByText("定义绑定键")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存绑定" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "暂无预制报表" })).toBeInTheDocument();
    expect(screen.queryByText("运行结果")).not.toBeInTheDocument();
    expect(screen.queryByText("报表导出")).not.toBeInTheDocument();
  });

  it("run success displays table headers", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "运行报表 实体生命周期分布" }));
    expect(await screen.findByText("status")).toBeInTheDocument();
    expect(screen.getByText("cnt")).toBeInTheDocument();
  });

  it("auto-runs binding from hub deep-link query", async () => {
    renderPage("/admin/reports?binding=prefab-entity-lifecycle");
    expect(await screen.findByText("实体生命周期分布")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/v1/reports/prefab/bindings/prefab-entity-lifecycle/run",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(await screen.findByText("status")).toBeInTheDocument();
    expect(mockApiFetch.mock.calls.filter(([path]) => String(path).includes("/run")).length).toBe(1);
  });

  it("viewer sees forbidden message on run error", async () => {
    const { ApiRequestError } = await import("@/lib/api");
    authState.user = { id: "v1", username: "viewer", roles: ["viewer"] };
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
        throw new ApiRequestError("无权运行", "RPT_PREFAB_RUN_FORBIDDEN");
      }
      return { items: [], total: 0 };
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "运行报表 实体生命周期分布" }));
    await waitFor(() => {
      expect(screen.getByText("无权运行预制报表")).toBeInTheDocument();
    });
  });

  it("shows entity-not-ready guidance when physical table missing", async () => {
    const { ApiRequestError } = await import("@/lib/api");
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
        throw new ApiRequestError("no physical table", "RPT_PREFAB_ENTITY_NOT_READY");
      }
      return { items: [], total: 0 };
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: "运行报表 实体生命周期分布" }));
    expect(await screen.findByText("实体数据尚未就绪")).toBeInTheDocument();
    expect(screen.getByText(/DEV_REPORT_SEED=1/)).toBeInTheDocument();
  });
});
