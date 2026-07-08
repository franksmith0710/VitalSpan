import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  };
});
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

import { ApiRequestError } from "@/lib/api";
import { DatasourceFormPage } from "./DatasourceFormPage";

const MOCK_TYPES = {
  items: [
    { type: "mysql", displayName: "MySQL" },
    { type: "dm", displayName: "达梦 DM" },
    { type: "kingbase", displayName: "人大金仓 KingbaseES" },
    { type: "gbase", displayName: "南大通用 GBase" },
    { type: "oceanbase", displayName: "OceanBase" },
    { type: "tidb", displayName: "TiDB" },
    { type: "gaussdb", displayName: "GaussDB" },
    { type: "rest_api", displayName: "REST API" },
    { type: "excel", displayName: "Excel" },
    { type: "csv", displayName: "CSV" },
    { type: "db2", displayName: "IBM Db2" },
    { type: "impala", displayName: "Apache Impala" },
    { type: "redshift", displayName: "AWS Redshift" },
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

  it("T-CONN-R243-FE-01: selecting gaussdb sets port 5432", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    await selectType("GaussDB");
    expect(screen.getByLabelText("端口")).toHaveValue(5432);
  });

  it("T-CONN-R243-FE-02: selecting gaussdb shows Schema database label and hint", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    await selectType("GaussDB");
    expect(screen.getByLabelText(/Schema/)).toBeInTheDocument();
    expect(
      screen.getByText(/GaussDB 兼容 PostgreSQL 协议/),
    ).toBeInTheDocument();
  });

  it("T-CONN-R249-FE-01: renders rest_api excel csv db2 impala in types", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "REST API" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Excel" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "CSV" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "IBM Db2" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Apache Impala" })).toBeInTheDocument();
  });

  it("T-CONN-R249-FE-02: selecting rest_api sets port 443", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    await selectType("REST API");
    expect(screen.getByLabelText("端口")).toHaveValue(443);
  });

  it("T-CONN-R249-FE-03: selecting db2 sets port 50000", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    await selectType("IBM Db2");
    expect(screen.getByLabelText("端口")).toHaveValue(50000);
  });

  it("T-CONN-R249-FE-04: selecting impala shows protocol hint", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    await selectType("Apache Impala");
    expect(screen.getByText(/兼容 Hive 协议/)).toBeInTheDocument();
  });
});

describe("DatasourceFormPage redshift smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });
  afterEach(() => cleanup());

  it("T-CONN-R250-FE-01: redshift 类型在下拉中可选", async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_TYPES);
    renderForm();
    await waitFor(() => screen.getByRole("combobox"));
    await selectType("AWS Redshift");
    expect(screen.getByRole("combobox")).toHaveTextContent("AWS Redshift");
  });

  it("T-CONN-R250-FE-02: 选中 redshift 后 port 自动填充 5439", async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_TYPES);
    renderForm();
    await waitFor(() => screen.getByRole("combobox"));
    await selectType("AWS Redshift");
    const portInput = screen.getByLabelText(/端口/i) as HTMLInputElement;
    expect(portInput.value).toBe("5439");
  });
});

describe("DatasourceFormPage save error recovery", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/datasources/types") return MOCK_TYPES;
      if (path === "/api/v1/datasources" && init?.method === "POST") {
        throw new ApiRequestError("Data source code already exists", "DATASOURCE_CODE_CONFLICT");
      }
      throw new Error(`unexpected path ${path}`);
    });
  });
  afterEach(() => cleanup());

  it("T-CONN-FE-SAVE-01: 标识冲突报错后仍可修改标识并再次提交", async () => {
    renderForm();
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/datasources/types"));

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("名称"), "重复测试源");
    await user.type(screen.getByLabelText("标识"), "dup-code");
    await user.type(screen.getByLabelText("主机"), "127.0.0.1");
    await user.type(screen.getByLabelText("数据库"), "demo");
    await user.type(screen.getByLabelText("用户名"), "root");
    await user.type(screen.getByLabelText("密码"), "secret");

    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("数据源标识已存在");

    const codeInput = screen.getByLabelText("标识");
    expect(codeInput).not.toBeDisabled();
    await user.clear(codeInput);
    await user.type(codeInput, "unique-code");
    expect(codeInput).toHaveValue("unique-code");

    mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/datasources/types") return MOCK_TYPES;
      if (path === "/api/v1/datasources" && init?.method === "POST") {
        return { id: "ds-new", code: "unique-code", name: "重复测试源", type: "mysql", host: "127.0.0.1", port: 3306, database: "demo", username: "root" };
      }
      throw new Error(`unexpected path ${path}`);
    });

    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(3));
  });
});
