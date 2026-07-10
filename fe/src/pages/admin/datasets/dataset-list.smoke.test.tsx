import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DatasetListPage } from "./DatasetListPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DatasetListPage />
    </QueryClientProvider>,
  );
}

describe("DatasetListPage editor", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it("T1-FE-01: opens create dialog with SchemaBrowser picker (no raw JSON textarea)", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/v1/datasets")) return { items: [], total: 0 };
      if (path.startsWith("/api/v1/datasources") && !path.includes("/schemas")) {
        return { items: [{ id: "ds-1", name: "分析库", database: "public" }] };
      }
      if (path.endsWith("/schemas")) return { items: [{ name: "public" }] };
      if (path.includes("/tables")) return { items: [{ name: "orders", type: "table" }] };
      if (path.includes("/columns")) {
        return { items: [{ name: "id", dataType: "integer", nullable: false }] };
      }
      return {};
    });

    renderPage();
    expect(await screen.findByText("暂无 Dataset")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: /新建 Dataset/i })[0]);
    expect(await screen.findByRole("heading", { name: "新建 Dataset" })).toBeInTheDocument();
    expect(screen.getByText(/浏览数据源（SchemaBrowser）/)).toBeInTheDocument();
    expect(screen.getByText("计算字段")).toBeInTheDocument();
    expect(screen.queryByLabelText(/计算字段 JSON/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/表名（每行一个）/)).not.toBeInTheDocument();

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/datasources/ds-1/schemas"),
    );
  });

  it("T1-FE-02: edit opens picker with existing tables (no JSON textarea)", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/v1/datasets?")) {
        return {
          items: [
            {
              datasetId: "ds-demo",
              displayName: "演示",
              tables: [{ name: "public.orders" }],
              computedFields: [{ name: "amt2", expression: "amount * 2" }],
              allowedRoles: ["analyst"],
              boundConfigId: null,
            },
          ],
          total: 1,
        };
      }
      if (path.startsWith("/api/v1/datasources") && !path.includes("/schemas")) {
        return { items: [{ id: "ds-1", name: "分析库", database: "public" }] };
      }
      if (path.endsWith("/schemas")) return { items: [{ name: "public" }] };
      if (path.includes("/tables")) return { items: [{ name: "orders", type: "table" }] };
      if (path.includes("/columns")) {
        return { items: [{ name: "amount", dataType: "numeric", nullable: true }] };
      }
      return {};
    });

    renderPage();
    expect(await screen.findByText("演示")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /编辑 演示/i }));
    expect(await screen.findByRole("heading", { name: "编辑 Dataset" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("amt2")).toBeInTheDocument();
    expect(screen.getByDisplayValue("amount * 2")).toBeInTheDocument();
    expect(screen.getByText("public.orders")).toBeInTheDocument();
    expect(screen.queryByLabelText(/计算字段 JSON/)).not.toBeInTheDocument();
  });
});
