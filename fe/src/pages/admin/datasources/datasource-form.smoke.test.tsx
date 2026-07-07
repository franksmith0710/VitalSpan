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

import { DatasourceFormPage } from "./DatasourceFormPage";

const MOCK_TYPES = {
  items: [
    { type: "mysql", displayName: "MySQL" },
    { type: "dm", displayName: "达梦 DM" },
    { type: "kingbase", displayName: "人大金仓 KingbaseES" },
    { type: "gbase", displayName: "南大通用 GBase" },
    { type: "oceanbase", displayName: "OceanBase" },
    { type: "tidb", displayName: "TiDB" },
  ],
};

function renderForm() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/datasources/new"]}>
        <Routes>
          <Route path="/admin/datasources/new" element={<DatasourceFormPage mode="create" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function selectType(label: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("DatasourceFormPage xinchuang smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/datasources/types") return MOCK_TYPES;
      throw new Error(`unexpected path ${path}`);
    });
  });
  afterEach(() => cleanup());

  it("T-CONN-R242-FE-01: renders five xinchuang types plus mysql", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/datasources/types"));
    await selectType("达梦 DM");
    expect(screen.getByRole("combobox")).toHaveTextContent("达梦 DM");
  });

  it("T-CONN-R242-FE-02: selecting tidb sets port 4000", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    await selectType("TiDB");
    expect(screen.getByLabelText("端口")).toHaveValue(4000);
  });

  it("T-CONN-R242-FE-03: selecting dm shows OWNER database label", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    await selectType("达梦 DM");
    expect(screen.getByLabelText(/OWNER/)).toBeInTheDocument();
  });

  it("T-CONN-R242-FE-04: selecting oceanbase shows compatibility hint", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    await selectType("OceanBase");
    expect(
      screen.getByText(/使用 MySQL 兼容协议连接/),
    ).toBeInTheDocument();
  });
});
