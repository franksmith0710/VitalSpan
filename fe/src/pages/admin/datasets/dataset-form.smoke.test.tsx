import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
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
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { DatasetFormPage } from "./DatasetFormPage";
import { DatasetListPage } from "./DatasetListPage";

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

function renderCreateForm() {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/datasets/new"]}>
      <Routes>
        <Route path="/admin/datasets/new" element={<DatasetFormPage mode="create" />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderList() {
  return renderWithProviders(
    <MemoryRouter initialEntries={["/admin/datasets"]}>
      <Routes>
        <Route path="/admin/datasets" element={<DatasetListPage />} />
        <Route path="/admin/datasets/new" element={<DatasetFormPage mode="create" />} />
      </Routes>
    </MemoryRouter>,
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
        return { items: [{ id: "ds-1", name: "分析库", database: "public", type: "postgresql" }] };
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
    expect(await screen.findByTestId("schema-browser")).toBeInTheDocument();
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

  it("T1-FE-03: edit page loads existing dataset with field workbench", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/datasets/ds-demo") {
        return {
          datasetId: "ds-demo",
          displayName: "演示",
          tables: [{ name: "public.orders" }],
          computedFields: [{ name: "amt2", expression: "amount * 2" }],
          allowedRoles: ["analyst"],
          tableSourceDataSourceId: "ds-1",
          boundConfigId: null,
        };
      }
      if (path.startsWith("/api/v1/datasources") && !path.includes("/schemas")) {
        return { items: [{ id: "ds-1", name: "分析库", database: "public", type: "postgresql" }] };
      }
      if (path.endsWith("/schemas")) return { items: [{ name: "public" }] };
      if (path.includes("/tables")) return { items: [{ name: "orders", type: "table" }] };
      if (path.includes("/columns")) {
        return {
          items: [
            { name: "id", dataType: "integer", nullable: false },
            { name: "amount", dataType: "numeric", nullable: true },
          ],
        };
      }
      return {};
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/admin/datasets/ds-demo/edit"]}>
        <Routes>
          <Route path="/admin/datasets/:id/edit" element={<DatasetFormPage mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "编辑数据集" })).toBeInTheDocument();
    expect(await screen.findByTestId("schema-browser")).toBeInTheDocument();
    expect(screen.getAllByText("public.orders").length).toBeGreaterThan(0);
    expect(await screen.findByText("字段工作台")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /绑定配置/ })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: /计算字段/ }));
    expect(await screen.findByDisplayValue("amt2")).toBeInTheDocument();
  });

  it("T1-FE-04: sync dataset shows merged field workbench without bind tab", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/datasets/orders_clean_3") {
        return {
          datasetId: "orders_clean_3",
          displayName: "同步：rest REST API2323",
          origin: "sync_job",
          syncJobId: "38da8834-0000-4000-8000-000000000001",
          tables: [{ name: "public.orders_clean_3" }],
          computedFields: [],
          allowedRoles: ["analyst"],
          tableSourceDataSourceId: "ds-analytics",
          boundConfigId: "cfg-bound",
        };
      }
      if (path === "/api/v1/query/configs/cfg-bound") {
        return {
          id: "cfg-bound",
          configType: "dataset_query",
          payload: {
            dataSourceId: "ds-analytics",
            connectorType: "postgresql",
            schema: "public",
            table: "orders_clean_3",
            columns: ["id", "amount", "region", "product_name"],
            columnKinds: { amount: "metric", region: "dimension" },
          },
        };
      }
      if (path.startsWith("/api/v1/datasources") && !path.includes("/schemas")) {
        return {
          items: [
            {
              id: "ds-analytics",
              name: "托管分析库",
              code: "analytics",
              type: "postgresql",
              port: 5433,
              database: "analytics",
            },
          ],
        };
      }
      if (path.endsWith("/schemas")) return { items: [{ name: "public" }] };
      if (path.includes("/tables")) {
        return { items: [{ name: "orders_clean_3", type: "table" }] };
      }
      if (path.includes("/columns")) {
        return {
          items: [
            { name: "id" },
            { name: "amount" },
            { name: "region" },
            { name: "product_name" },
          ],
        };
      }
      return {};
    });

    renderWithProviders(
      <MemoryRouter initialEntries={["/admin/datasets/orders_clean_3/edit"]}>
        <Routes>
          <Route path="/admin/datasets/:id/edit" element={<DatasetFormPage mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "编辑数据集" })).toBeInTheDocument();
    expect(await screen.findByText("字段工作台")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /绑定配置/ })).not.toBeInTheDocument();
    expect(screen.getByText("同步产物")).toBeInTheDocument();
    expect(screen.getByText("已绑定")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新绑定（自动识别）" })).toBeInTheDocument();
    expect(screen.queryByText("加载中…")).not.toBeInTheDocument();
  });
});
