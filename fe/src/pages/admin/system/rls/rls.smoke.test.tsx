import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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
});
