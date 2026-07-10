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
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DatasetFormPage } from "./DatasetFormPage";
import { DatasetListPage } from "./DatasetListPage";

function renderCreateForm() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/datasets/new"]}>
        <Routes>
          <Route path="/admin/datasets/new" element={<DatasetFormPage mode="create" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderList() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/datasets"]}>
        <Routes>
          <Route path="/admin/datasets" element={<DatasetListPage />} />
          <Route path="/admin/datasets/new" element={<DatasetFormPage mode="create" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Dataset form pages", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });
  afterEach(() => {
    cleanup();
  });

  it("T1-FE-01: create page renders form with SchemaBrowser picker", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
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

    renderCreateForm();
    expect(await screen.findByRole("heading", { name: "新建 Dataset" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回列表" })).toHaveAttribute("href", "/admin/datasets");
    expect(await screen.findByLabelText("选择数据源")).toBeInTheDocument();
    expect(screen.queryByLabelText(/计算字段 JSON/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/datasources/ds-1/schemas"),
    );
  });

  it("T1-FE-02: list links to standalone create page", async () => {
    mockApiFetch.mockResolvedValue({ items: [], total: 0 });
    renderList();
    expect(await screen.findByText("暂无 Dataset")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /新建 Dataset/i })[0]).toHaveAttribute(
      "href",
      "/admin/datasets/new",
    );
  });

  it("T1-FE-03: edit page loads existing dataset", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/datasets/ds-demo") {
        return {
          datasetId: "ds-demo",
          displayName: "演示",
          tables: [{ name: "public.orders" }],
          computedFields: [{ name: "amt2", expression: "amount * 2" }],
          allowedRoles: ["analyst"],
          boundConfigId: null,
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

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/admin/datasets/ds-demo/edit"]}>
          <Routes>
            <Route path="/admin/datasets/:id/edit" element={<DatasetFormPage mode="edit" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "编辑 Dataset" })).toBeInTheDocument();
    expect(await screen.findByDisplayValue("amt2")).toBeInTheDocument();
    expect(await screen.findByText("public.orders")).toBeInTheDocument();
  });
});
