import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
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

import { SystemAdminHomePage } from "./SystemAdminHomePage";

function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={["/admin/system"]}>
          <Routes>
            <Route path="/admin/system" element={<SystemAdminHomePage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("SystemAdminHomePage smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it("renders setup wizard and progress", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path === "/api/v1/orgs") return { items: [] };
      if (path.startsWith("/api/v1/users")) return { total: 1, items: [{ id: "1", username: "admin" }] };
      if (path.startsWith("/api/v1/roles")) {
        return {
          items: [
            { id: "r1", code: "admin", name: "管理员", isRoot: true },
            { id: "r2", code: "analyst", name: "分析师", isRoot: false },
          ],
          total: 2,
        };
      }
      if (path.startsWith("/api/v1/resource-grants")) return { items: [] };
      return {};
    });
    renderHome();
    expect(await screen.findByText("首租户配置向导")).toBeInTheDocument();
    expect(await screen.findByText("建立组织架构")).toBeInTheDocument();
    expect(await screen.findByText("配置岗位角色")).toBeInTheDocument();
  });

  it("links to org setup step", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path === "/api/v1/orgs") return { items: [] };
      if (path.startsWith("/api/v1/users")) return { total: 1, items: [] };
      if (path.startsWith("/api/v1/roles")) return { items: [{ id: "r1", isRoot: true }], total: 1 };
      if (path.startsWith("/api/v1/resource-grants")) return { items: [] };
      return {};
    });
    renderHome();
    const link = await screen.findByRole("link", { name: /建立组织架构/ });
    expect(link).toHaveAttribute("href", "/admin/system/orgs");
  });
});
