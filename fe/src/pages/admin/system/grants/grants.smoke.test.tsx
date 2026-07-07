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

import { GrantsPage } from "./GrantsPage";

const ROLE_ID = "11111111-1111-4111-8111-111111111111";
const RES_ID = "22222222-2222-4222-8222-222222222222";
const GRANT_ID = "33333333-3333-4333-8333-333333333333";

function renderGrants() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/system/grants"]}>
        <Routes>
          <Route path="/admin/system/grants" element={<GrantsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("GrantsPage smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it("T-AUTH-004-FE-01: renders table with role name, resource type, resource id", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.startsWith("/api/v1/roles")) {
        return {
          items: [
            { id: ROLE_ID, code: "analyst", name: "分析师", description: null, isActive: true },
          ],
          total: 1,
        };
      }
      if (path.startsWith("/api/v1/resource-grants")) {
        return {
          items: [
            { id: GRANT_ID, roleId: ROLE_ID, resourceType: "dashboard", resourceId: RES_ID },
          ],
        };
      }
      return {};
    });
    renderGrants();
    expect(await screen.findByRole("table", { name: "资源授权列表" })).toBeInTheDocument();
    expect(await screen.findByText("分析师")).toBeInTheDocument();
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(await screen.findByText(RES_ID)).toBeInTheDocument();
  });

  it("T-AUTH-004-FE-02: create dialog shows field errors on empty submit", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      if (path.startsWith("/api/v1/roles")) return { items: [], total: 0 };
      if (path.startsWith("/api/v1/resource-grants")) return { items: [] };
      return {};
    });
    renderGrants();
    await userEvent.click(await screen.findByRole("button", { name: "新建授权" }));
    await userEvent.click(screen.getByRole("button", { name: "确认" }));
    expect(await screen.findByText("请选择角色")).toBeInTheDocument();
  });

  it("T-AUTH-004-FE-03: POST success closes dialog and refreshes list", async () => {
    let listCalls = 0;
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === "/api/v1/resource-grants" && init?.method === "POST") {
        return { id: GRANT_ID, roleId: ROLE_ID, resourceType: "report", resourceId: RES_ID };
      }
      if (path.startsWith("/api/v1/roles")) {
        return {
          items: [
            { id: ROLE_ID, code: "analyst", name: "分析师", description: null, isActive: true },
          ],
          total: 1,
        };
      }
      if (path.startsWith("/api/v1/resource-grants")) {
        listCalls += 1;
        if (listCalls === 1) return { items: [] };
        return {
          items: [
            { id: GRANT_ID, roleId: ROLE_ID, resourceType: "report", resourceId: RES_ID },
          ],
        };
      }
      return {};
    });
    renderGrants();
    await userEvent.click(await screen.findByRole("button", { name: "新建授权" }));
    await userEvent.click(screen.getByLabelText("角色"));
    await userEvent.click(await screen.findByRole("option", { name: "分析师" }));
    await userEvent.click(screen.getByLabelText("资源类型"));
    await userEvent.click(await screen.findByRole("option", { name: "报表" }));
    await userEvent.type(screen.getByLabelText("资源 ID"), RES_ID);
    await userEvent.click(screen.getByRole("button", { name: "确认" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("报表")).toBeInTheDocument();
  });

  it("T-AUTH-004-FE-04: revoke AlertDialog calls DELETE", async () => {
    const deletePaths: string[] = [];
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (init?.method === "DELETE") deletePaths.push(path);
      if (path.startsWith("/api/v1/roles")) {
        return {
          items: [
            { id: ROLE_ID, code: "analyst", name: "分析师", description: null, isActive: true },
          ],
          total: 1,
        };
      }
      if (path.startsWith("/api/v1/resource-grants")) {
        return {
          items: [
            { id: GRANT_ID, roleId: ROLE_ID, resourceType: "datasource", resourceId: RES_ID },
          ],
        };
      }
      return {};
    });
    renderGrants();
    await userEvent.click(await screen.findByRole("button", { name: "撤销授权" }));
    await userEvent.click(screen.getByRole("button", { name: "确认撤销" }));
    await waitFor(() =>
      expect(deletePaths.some((p) => p.includes(GRANT_ID))).toBe(true),
    );
  });
});
