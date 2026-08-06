import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { afterEach, describe, expect, it, vi } from "vitest";

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

import { RlsAdminPage } from "./RlsAdminPage";

function renderRls() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter>
          <RlsAdminPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("RlsAdminPage smoke", () => {
  afterEach(() => {
    cleanup();
    mockApiFetch.mockReset();
  });

  it("renders dimensions and can open groups / bindings tabs", async () => {
    mockApiFetch.mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.startsWith("/api/v1/rls/dimensions")) {
        return {
          items: [
            {
              id: "dim-1",
              code: "region",
              name: "区域",
              value_type: "string",
              org_dimension: false,
              description: null,
            },
          ],
          total: 1,
        };
      }
      if (p.startsWith("/api/v1/rls/groups")) {
        return {
          items: [
            {
              id: "grp-1",
              dimension_type_id: "dim-1",
              code: "east",
              name: "华东",
              parent_id: null,
            },
          ],
          total: 1,
        };
      }
      if (p.startsWith("/api/v1/roles")) {
        return {
          items: [{ id: "role-1", code: "viewer", name: "查看者", description: null, isActive: true }],
          total: 1,
        };
      }
      return {};
    });

    const user = userEvent.setup();
    renderRls();

    expect(await screen.findByRole("heading", { name: "行级权限（高级）" })).toBeInTheDocument();
    expect(await screen.findByText("区域")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "维度分组" }));
    expect(await screen.findByText("华东")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建分组" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "角色绑定" }));
    expect(await screen.findByText(/全量替换/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存绑定" })).toBeInTheDocument();
  });

  it("T-RLS-02: edit dimension type sends PUT", async () => {
    mockApiFetch.mockImplementation(async (path: unknown, init?: RequestInit) => {
      const p = String(path);
      if (p === "/api/v1/rls/dimensions/dim-1" && init?.method === "PUT") {
        return { id: "dim-1", code: "region", name: "区域新", description: "说明", value_type: "string", org_dimension: false };
      }
      if (p.startsWith("/api/v1/rls/dimensions")) {
        return {
          items: [
            {
              id: "dim-1",
              code: "region",
              name: "区域",
              value_type: "string",
              org_dimension: false,
              description: null,
            },
          ],
          total: 1,
        };
      }
      return { items: [], total: 0 };
    });
    const user = userEvent.setup();
    renderRls();
    await screen.findByText("区域");
    await user.click(screen.getByRole("button", { name: "编辑维度类型" }));
    const nameInput = screen.getByLabelText("名称");
    await user.clear(nameInput);
    await user.type(nameInput, "区域新");
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      const putCall = mockApiFetch.mock.calls.find(
        (c) => c[0] === "/api/v1/rls/dimensions/dim-1" && (c[1] as RequestInit)?.method === "PUT",
      );
      expect(putCall).toBeTruthy();
      const body = JSON.parse(String((putCall![1] as RequestInit).body));
      expect(body.name).toBe("区域新");
    });
  });

  it("T-RLS-03: delete dimension type sends DELETE after confirm", async () => {
    mockApiFetch.mockImplementation(async (path: unknown, init?: RequestInit) => {
      const p = String(path);
      if (p === "/api/v1/rls/dimensions/dim-1" && init?.method === "DELETE") {
        return {};
      }
      if (p.startsWith("/api/v1/rls/dimensions")) {
        return {
          items: [
            {
              id: "dim-1",
              code: "region",
              name: "区域",
              value_type: "string",
              org_dimension: false,
              description: null,
            },
          ],
          total: 1,
        };
      }
      return { items: [], total: 0 };
    });
    const user = userEvent.setup();
    renderRls();
    await screen.findByText("区域");
    await user.click(screen.getByRole("button", { name: "删除维度类型" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    await waitFor(() => {
      expect(
        mockApiFetch.mock.calls.some(
          (c) => c[0] === "/api/v1/rls/dimensions/dim-1" && (c[1] as RequestInit)?.method === "DELETE",
        ),
      ).toBe(true);
    });
  });
});
