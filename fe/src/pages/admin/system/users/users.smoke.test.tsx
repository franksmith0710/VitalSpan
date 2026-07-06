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

import { UserListPage } from "./UserListPage";

const ROLE_A = "00000000-0000-4000-8000-000000000001";
const USER_A = "00000000-0000-4000-8000-000000000010";

function renderUsers() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/system/users"]}>
        <Routes>
          <Route path="/admin/system/users" element={<UserListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("UserListPage smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it("T-AUTH-003-01: renders user table from GET /users", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.startsWith("/api/v1/users") && !path.includes("/roles")) {
        return { items: [{ id: USER_A, username: "alice" }], total: 1 };
      }
      return { items: [] };
    });
    renderUsers();
    expect(await screen.findByText("alice")).toBeInTheDocument();
  });

  it("T-AUTH-003-02: save role bind triggers PUT with roleIds", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === `/api/v1/users/${USER_A}/roles` && init?.method === "PUT") {
        return { items: [{ id: ROLE_A, code: "viewer", name: "查看者" }] };
      }
      if (path === `/api/v1/users/${USER_A}/roles`) {
        return { items: [] };
      }
      if (path.startsWith("/api/v1/roles")) {
        return { items: [{ id: ROLE_A, code: "viewer", name: "查看者", isActive: true }], total: 1 };
      }
      if (path.startsWith("/api/v1/users")) {
        return { items: [{ id: USER_A, username: "alice" }], total: 1 };
      }
      return {};
    });
    renderUsers();
    await userEvent.click(await screen.findByRole("button", { name: "管理角色" }));
    const checkbox = await screen.findByRole("checkbox", { name: /查看者/ });
    await userEvent.click(checkbox);
    await userEvent.click(screen.getByRole("button", { name: "保存角色绑定" }));
    await waitFor(() => {
      const putCall = mockApiFetch.mock.calls.find(
        (c) => c[0] === `/api/v1/users/${USER_A}/roles` && (c[1] as RequestInit)?.method === "PUT",
      );
      expect(putCall).toBeTruthy();
      const body = JSON.parse(String((putCall![1] as RequestInit).body));
      expect(body.role_ids).toEqual([ROLE_A]);
    });
  });
});
