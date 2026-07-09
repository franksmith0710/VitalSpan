import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { RoleListPage } from "./RoleListPage";

function renderRoles() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/system/roles"]}>
        <Routes>
          <Route path="/admin/system/roles" element={<RoleListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RoleListPage smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it("T-AUTH-001-01: renders table and create button", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.startsWith("/api/v1/roles")) return { items: [], total: 0 };
      if (path.startsWith("/api/v1/dashboards")) return { items: [] };
      return {};
    });
    renderRoles();
    expect(await screen.findByRole("button", { name: "新建角色" })).toBeInTheDocument();
    expect(await screen.findByText("暂无角色")).toBeInTheDocument();
  });

  it("T-AUTH-001-03: search shows a single clear control", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.startsWith("/api/v1/roles")) return { items: [], total: 0 };
      if (path.startsWith("/api/v1/dashboards")) return { items: [] };
      return {};
    });
    const user = userEvent.setup();
    renderRoles();
    const input = await screen.findByRole("searchbox", { name: "搜索角色" });
    await user.type(input, "阿达");
    expect(screen.getAllByRole("button", { name: "清除搜索" })).toHaveLength(1);
    expect(input).toHaveAttribute("type", "text");
  });

  it("T-AUTH-001-02: POST role refetches list", async () => {
    let listCall = 0;
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === "/api/v1/roles" && init?.method === "POST") {
        return { id: "r-new", code: "viewer2", name: "查看者2", description: null, isActive: true };
      }
      if (path.startsWith("/api/v1/roles")) {
        listCall += 1;
        if (listCall === 1) return { items: [], total: 0 };
        return {
          items: [{ id: "r-new", code: "viewer2", name: "查看者2", description: null, isActive: true }],
          total: 1,
        };
      }
      if (path.startsWith("/api/v1/dashboards")) return { items: [] };
      return {};
    });
    renderRoles();
    await userEvent.click(await screen.findByRole("button", { name: "新建角色" }));
    await userEvent.type(screen.getByLabelText("角色编码"), "viewer2");
    await userEvent.type(screen.getByLabelText("显示名"), "查看者2");
    await userEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(screen.getByText("viewer2")).toBeInTheDocument());
  });
});
