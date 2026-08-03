import { cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import * as ReactRouter from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EtlRulesPage } from "./EtlRulesPage";
import { SyncJobFormPage } from "./SyncJobFormPage";
import { SyncJobHistoryPage } from "./SyncJobHistoryPage";
import { SyncJobsPage } from "./SyncJobsPage";

const mockNavigate = vi.fn();
const mockApiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", roles: ["admin"], isRoot: true, permissions: [] },
    isLoading: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

function render(ui: ReactElement) {
  return rtlRender(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>);
}

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

function markEtlRulesDirty() {
  const fromInput = screen.getByPlaceholderText("product_name");
  fireEvent.change(fromInput, { target: { value: `${fromInput.getAttribute("value") ?? "x"} ` } });
}

function mockSyncJobHistoryApi(
  runs: unknown[],
  targetTable = "orders_clean",
) {
  mockApiFetch.mockImplementation((url: string) => {
    if (typeof url === "string" && url.includes("/runs")) {
      return Promise.resolve({ items: runs });
    }
    if (typeof url === "string" && url.includes("/sync-jobs/")) {
      return Promise.resolve({ target_table: targetTable });
    }
    return Promise.resolve({});
  });
}

describe("ingestion admin smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockNavigate.mockReset();
    vi.spyOn(ReactRouter, "useNavigate").mockReturnValue(mockNavigate);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("SyncJobsPage_empty_state", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("暂无同步任务")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "新建任务" }).length).toBeGreaterThanOrEqual(1);
  });

  it("SyncJobsPage_error_state", async () => {
    setViewport(375);
    mockApiFetch.mockRejectedValueOnce(new Error("加载失败，请重试"));
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("加载失败，请重试")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

  it("SyncJobsPage_run_flow", async () => {
    setViewport(1400);
    mockApiFetch
      .mockResolvedValueOnce({
        items: [
          {
            id: "job-1",
            name: "demo",
            source_type: "mysql",
            target_table: "orders_clean",
            enabled: true,
            schedule_cron: null,
          },
        ],
      })
      .mockResolvedValueOnce(undefined);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const runBtn = await screen.findByRole("button", { name: "手动运行同步" });
    fireEvent.click(runBtn);
    expect(await screen.findByText("确认手动运行同步？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "运行" }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/v1/ingestion/sync-jobs/job-1/run",
        { method: "POST" },
      );
    });
  });

  it("SyncJobHistoryPage_shows_runs", async () => {
    setViewport(1400);
    mockSyncJobHistoryApi([
        {
          id: "run-1",
          status: "succeeded",
          started_at: "2026-07-03T08:00:00Z",
          finished_at: "2026-07-03T08:00:01Z",
          rows_synced: 4,
          error_message: null,
          trace_id: "trace-abc",
          retry_count: 0,
        },
        {
          id: "run-2",
          status: "failed",
          started_at: "2026-07-03T09:00:00Z",
          finished_at: "2026-07-03T09:00:02Z",
          rows_synced: null,
          error_message: "连接失败",
          trace_id: "trace-def",
          retry_count: 1,
        },
      ],
    );
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("成功")).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
  });

  it("SyncJobFormPage_create_submit", async () => {
    setViewport(375);
    mockApiFetch
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ id: "new-job" });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/new"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByLabelText("任务名称");
    fireEvent.change(screen.getByLabelText("任务名称"), { target: { value: "e2e-smoke-job" } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/v1/ingestion/sync-jobs",
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockNavigate).toHaveBeenCalledWith("/admin/ingestion/sync-jobs/new-job/edit", {
        replace: true,
      });
    });
  });

  it("SyncJobFormPage_datasource_mode_renders_select", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({
      items: [
        {
          id: "ds-1",
          name: "Sample MySQL",
          type: "mysql",
          host: "127.0.0.1",
          port: 3307,
          database: "sample_db",
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/new"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "使用已有数据源" }));
    expect(await screen.findByLabelText("MySQL 数据源")).toBeInTheDocument();
  });

  it("SyncJobFormPage_datasource_mode_submit_payload", async () => {
    setViewport(1400);
    mockApiFetch
      .mockResolvedValueOnce({
        items: [
          {
            id: "ds-1",
            name: "Sample MySQL",
            type: "mysql",
            host: "127.0.0.1",
            port: 3307,
            database: "sample_db",
          },
        ],
      })
      .mockResolvedValueOnce({ id: "new-ds-job" });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/new"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "使用已有数据源" }));
    fireEvent.click(await screen.findByRole("combobox", { name: "MySQL 数据源" }));
    fireEvent.click(await screen.findByRole("option", { name: "Sample MySQL" }));
    fireEvent.change(screen.getByLabelText("任务名称"), { target: { value: "ds-ref-smoke" } });
    fireEvent.change(screen.getByLabelText("源表"), { target: { value: "dirty_orders" } });
    fireEvent.change(screen.getByLabelText("目标表"), { target: { value: "orders_from_ds" } });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));
    await waitFor(() => {
      const postCall = mockApiFetch.mock.calls.find(
        (c) => c[0] === "/api/v1/ingestion/sync-jobs" && c[1]?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(String(postCall![1]?.body));
      expect(body).toMatchObject({
        name: "ds-ref-smoke",
        source_mode: "datasource",
        source_data_source_id: "ds-1",
        source_table: "dirty_orders",
        target_table: "orders_from_ds",
        sync_mode: "full",
      });
      expect(body.source).toBeUndefined();
    });
  });

  it("SyncJobFormPage_incremental_fields_conditional", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/new"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByLabelText("主键字段")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "增量" }));
    expect(await screen.findByLabelText("主键字段")).toBeInTheDocument();
    expect(screen.getByLabelText("增量字段")).toBeInTheDocument();
  });

  it("SyncJobsPage_shows_consume_guide_after_success", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({
      items: [
        {
          id: "job-1",
          name: "demo",
          source_type: "mysql",
          target_table: "orders_clean",
          enabled: true,
          schedule_cron: null,
          last_run: {
            status: "succeeded",
            started_at: "2026-08-03T07:00:00Z",
            finished_at: "2026-08-03T07:01:00Z",
            rows_synced: 5,
            error_message: null,
          },
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/同步成功 · 下一步/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "登记分析库" })).toHaveAttribute(
      "href",
      "/admin/datasources/new",
    );
  });

  it("SyncJobsEmptyState_shows_consume_step", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("登记分析库并出图")).toBeInTheDocument();
  });

  it("SyncJobFormPage_blocks_submit_when_name_empty (T-ING-06)", async () => {
    setViewport(375);
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/new"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const nameInput = await screen.findByLabelText("任务名称");
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.click(screen.getAllByRole("button", { name: "创建" })[0]);
    const postCalls = mockApiFetch.mock.calls.filter(
      (c) => c[0] === "/api/v1/ingestion/sync-jobs" && c[1]?.method === "POST",
    );
    expect(postCalls).toHaveLength(0);
  });

  it("SyncJobFormPage_password_field_is_masked (T-ING-07)", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/new"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const passwordInput = await screen.findByLabelText(/^密码/);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("EtlRulesPage_renders_default_rule_row_when_empty (T-ING-08)", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({ rules: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/etl-rules"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/etl-rules"
            element={<EtlRulesPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("button", { name: /保存/ })).toBeInTheDocument();
    expect(screen.getByText("规则类型")).toBeInTheDocument();
  });

  it("SyncJobHistoryPage_empty_state (T-ING-09)", async () => {
    setViewport(1400);
    mockSyncJobHistoryApi([]);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("暂无运行记录")).toBeInTheDocument();
  });

  it("SyncJobFormPage_edit_mode_shows_skeleton_while_loading (T-ING-10)", async () => {
    setViewport(1400);
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/edit"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/:id/edit" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      const skeletons = document.querySelectorAll(
        '[class*="skeleton"], [data-slot="skeleton"], [class*="animate-pulse"]',
      );
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("SyncJobsPage_delete_confirms_and_calls_delete (T-ING-11)", async () => {
    setViewport(1400);
    mockApiFetch
      .mockResolvedValueOnce({
        items: [
          {
            id: "job-del",
            name: "待删任务",
            source_type: "mysql",
            target_table: "t",
            enabled: true,
            schedule_cron: null,
          },
        ],
      })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "删除任务" }));
    expect(await screen.findByText("确认删除任务？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "删除" }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/v1/ingestion/sync-jobs/job-del",
        { method: "DELETE" },
      );
    });
  });

  it("SyncJobsPage_delete_cancel_skips_api (T-ING-12)", async () => {
    setViewport(375);
    mockApiFetch.mockResolvedValueOnce({
      items: [
        {
          id: "job-keep",
          name: "保留",
          source_type: "mysql",
          target_table: "t",
          enabled: true,
          schedule_cron: null,
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "删除任务" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(mockApiFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/run"),
      expect.objectContaining({ method: "DELETE" }),
    );
    const deleteCalls = mockApiFetch.mock.calls.filter((c) => c[1]?.method === "DELETE");
    expect(deleteCalls).toHaveLength(0);
  });

  it("SyncJobsPage_run_prevents_double_post (T-ING-13)", async () => {
    setViewport(1400);
    let resolveRun: () => void;
    const runPromise = new Promise<void>((r) => {
      resolveRun = r;
    });
    mockApiFetch
      .mockResolvedValueOnce({
        items: [
          {
            id: "job-run",
            name: "run-test",
            source_type: "mysql",
            target_table: "t",
            enabled: true,
            schedule_cron: null,
          },
        ],
      })
      .mockImplementationOnce(() => runPromise);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const runBtn = await screen.findByRole("button", { name: "手动运行同步" });
    fireEvent.click(runBtn);
    expect(await screen.findByText("确认手动运行同步？")).toBeInTheDocument();
    const confirmRun = screen.getByRole("button", { name: "运行" });
    fireEvent.click(confirmRun);
    fireEvent.click(confirmRun);
    const postRuns = mockApiFetch.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].endsWith("/run"),
    );
    expect(postRuns).toHaveLength(1);
    resolveRun!();
  });

  it("EtlRulesPage_error_state (T-ING-15)", async () => {
    setViewport(375);
    mockApiFetch.mockRejectedValueOnce(new Error("加载规则失败"));
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/etl-rules"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/etl-rules"
            element={<EtlRulesPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/加载规则失败|操作失败/)).toBeInTheDocument();
  });

  it("SyncJobHistoryPage_error_state (T-ING-14)", async () => {
    setViewport(375);
    let historyLoads = 0;
    mockApiFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/ingestion/sync-jobs/")) {
        historyLoads += 1;
        if (historyLoads <= 2) {
          return Promise.reject(new Error("加载历史失败"));
        }
        if (url.includes("/runs")) return Promise.resolve({ items: [] });
        return Promise.resolve({ target_table: "orders_clean" });
      }
      return Promise.resolve({});
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("加载历史失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => {
      expect(mockApiFetch.mock.calls.length).toBeGreaterThanOrEqual(4);
    });
  });

  it("SyncJobHistoryPage_requests_limit_20 (T-ING-16)", async () => {
    setViewport(1400);
    mockSyncJobHistoryApi([]);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("暂无运行记录");
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/ingestion/sync-jobs/job-1/runs?limit=100",
    );
  });

  it("EtlRulesPage_prevents_double_save (T-ING-17)", async () => {
    setViewport(1400);
    let resolveSave: () => void;
    const savePromise = new Promise<void>((r) => {
      resolveSave = r;
    });
    mockApiFetch
      .mockResolvedValueOnce({
        rules: [{ type: "rename_column", from: "product_name", to: "product" }],
      })
      .mockImplementationOnce(() => savePromise);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/etl-rules"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/etl-rules"
            element={<EtlRulesPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    const saveBtn = await screen.findByRole("button", { name: "保存规则" });
    markEtlRulesDirty();
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);
    const putCalls = mockApiFetch.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("/etl-rules") && c[1]?.method === "PUT",
    );
    expect(putCalls).toHaveLength(1);
    resolveSave!();
  });

  it("SyncJobFormPage_prevents_double_submit (T-ING-18)", async () => {
    setViewport(375);
    let resolveCreate: () => void;
    const createPromise = new Promise<{ id: string }>((r) => {
      resolveCreate = () => r({ id: "new-job" });
    });
    mockApiFetch
      .mockResolvedValueOnce({ items: [] })
      .mockImplementationOnce(() => createPromise);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/new"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByLabelText("任务名称");
    fireEvent.change(screen.getByLabelText("任务名称"), { target: { value: "double-guard" } });
    const createBtn = screen.getAllByRole("button", { name: "创建" })[0];
    fireEvent.click(createBtn);
    fireEvent.click(createBtn);
    const postCalls = mockApiFetch.mock.calls.filter(
      (c) => c[0] === "/api/v1/ingestion/sync-jobs" && c[1]?.method === "POST",
    );
    expect(postCalls).toHaveLength(1);
    resolveCreate!();
  });

  it("SyncJobsPage_first_paint_under_500ms (T-ING-19)", async () => {
    setViewport(1400);
    const jobs = Array.from({ length: 10 }, (_, i) => ({
      id: `job-${i}`,
      name: `任务 ${i}`,
      source_type: "mysql",
      target_table: `t${i}`,
      enabled: true,
      schedule_cron: null,
    }));
    mockApiFetch.mockResolvedValueOnce({ items: jobs });
    const start = performance.now();
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("任务 0");
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });

  it("EtlRulesPage_blocks_save_on_empty_rename_column (T-ING-20)", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({ rules: [{ type: "rename_column", from: "", to: "product" }] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/etl-rules"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/etl-rules"
            element={<EtlRulesPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    const saveBtn = await screen.findByRole("button", { name: "保存规则" });
    markEtlRulesDirty();
    fireEvent.click(saveBtn);
    expect(await screen.findByText(/请填写完整的列重命名规则|请填写规则涉及的列名/)).toBeInTheDocument();
    const putCalls = mockApiFetch.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("/etl-rules") && c[1]?.method === "PUT",
    );
    expect(putCalls).toHaveLength(0);
  });

  it("SyncJobHistoryPage_renders_20_rows_under_600ms (T-ING-21)", async () => {
    setViewport(1400);
    const runs = Array.from({ length: 20 }, (_, i) => ({
      id: `run-${i}`,
      status: i % 3 === 0 ? "failed" : "succeeded",
      trace_id: `trace-${i}`,
      started_at: `2026-07-0${(i % 9) + 1}T10:00:00Z`,
      finished_at: `2026-07-0${(i % 9) + 1}T10:01:00Z`,
      rows_synced: i,
      error_message: i % 3 === 0 ? "mock error" : null,
      retry_count: 0,
    }));
    mockSyncJobHistoryApi(runs);
    const start = performance.now();
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("trace-0");
    expect(performance.now() - start).toBeLessThan(600);
  });

  it("SyncJobFormPage_invalid_port_shows_error (T-ING-22)", async () => {
    setViewport(375);
    mockApiFetch.mockRejectedValueOnce({
      message: "请求参数无效",
      status: 422,
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/new"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByLabelText("任务名称");
    fireEvent.change(screen.getByLabelText("任务名称"), { target: { value: "bad-port" } });
    fireEvent.change(screen.getByLabelText("端口"), { target: { value: "0" } });
    fireEvent.click(screen.getAllByRole("button", { name: "创建" })[0]);
    expect(await screen.findByText(/请求参数无效|操作失败/)).toBeInTheDocument();
  });

  it("SyncJobFormPage_invalid_cron_shows_field_error_and_toast", async () => {
    setViewport(1400);
    const { toast } = await import("sonner");
    mockApiFetch.mockImplementation((url: string, init?: { method?: string }) => {
      if (url === "/api/v1/datasources") {
        return Promise.resolve({ items: [] });
      }
      if (url === "/api/v1/ingestion/sync-jobs" && init?.method === "POST") {
        return Promise.reject(
          Object.assign(new Error("body.schedule_cron: Value error"), {
            code: "VALIDATION_ERROR",
            fields: [{ field: "body.schedule_cron", message: "Value error, Cron 表达式格式无效" }],
          }),
        );
      }
      return Promise.resolve({});
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/new"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs/new" element={<SyncJobFormPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByLabelText("任务名称");
    fireEvent.change(screen.getByLabelText("任务名称"), { target: { value: "bad-cron-job" } });
    fireEvent.change(screen.getByLabelText("定时 Cron（可选）"), {
      target: { value: "0 0 *0 *15 *" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建" }));
    expect(await screen.findByText(/Cron 表达式格式无效（定时 Cron）/)).toBeInTheDocument();
    expect(document.getElementById("schedule_cron-error")).toHaveTextContent("Cron 表达式格式无效");
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Cron 表达式格式无效（定时 Cron）");
  });

  it("SyncJobHistoryPage_error_state_uses_semantic_tokens (T-ING-23)", async () => {
    setViewport(1400);
    mockApiFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/ingestion/sync-jobs/")) {
        return Promise.reject(new Error("加载历史失败"));
      }
      return Promise.resolve({});
    });
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("加载历史失败");
    const errorBanner = document.body.querySelector(".border-error-500");
    expect(errorBanner).toBeTruthy();
    const errorText = errorBanner?.querySelector("p");
    expect(errorText?.className).toMatch(/text-error-700|text-error-400/);
  });

  it("SyncJobHistoryPage_renders_50_rows_under_800ms (T-ING-24)", async () => {
    setViewport(1400);
    const runs = Array.from({ length: 50 }, (_, i) => ({
      id: `run-${i}`,
      status: i % 4 === 0 ? "failed" : "succeeded",
      trace_id: `trace-perf-${i}`,
      started_at: `2026-07-0${(i % 9) + 1}T10:00:00Z`,
      finished_at: `2026-07-0${(i % 9) + 1}T10:01:00Z`,
      rows_synced: i,
      error_message: i % 4 === 0 ? "mock sync error message" : null,
      retry_count: 0,
    }));
    mockSyncJobHistoryApi(runs);
    const start = performance.now();
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText(`trace-perf-0`);
    expect(performance.now() - start).toBeLessThan(800);
  });

  it("EtlRulesPage_empty_column_sets_aria_invalid (T-ING-25)", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({
      rules: [{ type: "rename_column", from: "", to: "product" }],
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/etl-rules"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/etl-rules"
            element={<EtlRulesPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    const saveBtn = await screen.findByRole("button", { name: "保存规则" });
    markEtlRulesDirty();
    fireEvent.click(saveBtn);
    await screen.findByText(/请填写完整的列重命名规则/);
    const fromInput = screen.getByPlaceholderText("product_name");
    expect(fromInput).toHaveAttribute("aria-invalid", "true");
  });

  it("SyncJobHistoryPage_error_banner_has_role_alert (T-ING-26)", async () => {
    setViewport(1400);
    mockApiFetch.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("/ingestion/sync-jobs/")) {
        return Promise.reject(new Error("加载历史失败"));
      }
      return Promise.resolve({});
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("加载历史失败");
    expect(screen.getByRole("alert")).toHaveTextContent("加载历史失败");
  });

  it("SyncJobsPage_mobile_first_paint_under_600ms (T-ING-27)", async () => {
    setViewport(375);
    mockApiFetch.mockResolvedValueOnce({
      items: [
        {
          id: "job-mobile",
          name: "mobile-perf-job",
          source_type: "mysql",
          target_table: "orders_mobile",
          enabled: true,
          schedule_cron: null,
        },
      ],
    });
    const start = performance.now();
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("mobile-perf-job");
    expect(performance.now() - start).toBeLessThan(600);
  });

  it("SyncJobsPage_run_confirms_and_calls_post (T-ING-28)", async () => {
    setViewport(1400);
    mockApiFetch
      .mockResolvedValueOnce({
        items: [
          {
            id: "job-run-confirm",
            name: "待运行任务",
            source_type: "mysql",
            target_table: "t",
            enabled: true,
            schedule_cron: null,
          },
        ],
      })
      .mockResolvedValueOnce(undefined);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "手动运行同步" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("确认手动运行同步？")).toBeInTheDocument();
    expect(within(dialog).getByText(/待运行任务/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "运行" }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/v1/ingestion/sync-jobs/job-run-confirm/run",
        { method: "POST" },
      );
    });
    const postRuns = mockApiFetch.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].endsWith("/run"),
    );
    expect(postRuns).toHaveLength(1);
  });

  it("SyncJobsPage_run_cancel_skips_api (T-ING-29)", async () => {
    setViewport(375);
    mockApiFetch.mockResolvedValueOnce({
      items: [
        {
          id: "job-no-run",
          name: "不运行",
          source_type: "mysql",
          target_table: "t",
          enabled: true,
          schedule_cron: null,
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "手动运行同步" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    const postRuns = mockApiFetch.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].endsWith("/run"),
    );
    expect(postRuns).toHaveLength(0);
  });

  it("SyncJobsPage_load_401_shows_error (T-ING-30)", async () => {
    setViewport(375);
    mockApiFetch.mockRejectedValueOnce(new Error("未登录或会话已过期"));
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("未登录或会话已过期")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

  it("SyncJobHistoryPage_renders_100_rows_under_900ms (T-ING-31)", async () => {
    setViewport(1400);
    const runs = Array.from({ length: 100 }, (_, i) => ({
      id: `run-${i}`,
      status: "succeeded",
      trace_id: `trace-100-${i}`,
      started_at: `2026-07-03T10:${String(i % 60).padStart(2, "0")}:00Z`,
      finished_at: `2026-07-03T10:${String(i % 60).padStart(2, "0")}:01Z`,
      rows_synced: i,
      error_message: null,
      retry_count: 0,
    }));
    mockSyncJobHistoryApi(runs);
    const start = performance.now();
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("trace-100-0");
    expect(performance.now() - start).toBeLessThan(900);
  });

  it("SyncJobHistoryPage_failed_row_shows_error_message (T-ING-32)", async () => {
    setViewport(1400);
    mockSyncJobHistoryApi([
      {
        id: "run-fail",
        status: "failed",
        started_at: "2026-07-03T10:00:00Z",
        finished_at: "2026-07-03T10:00:02Z",
        rows_synced: null,
        error_message: "连接失败",
        trace_id: "trace-fail-32",
        retry_count: 1,
      },
    ]);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/history"
            element={<SyncJobHistoryPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("连接失败")).toBeInTheDocument();
  });

  it("SyncJobsPage_list_shows_skeleton_while_loading (T-ING-33)", async () => {
    setViewport(1400);
    let resolveList: (value: { items: unknown[] }) => void;
    const listPromise = new Promise<{ items: unknown[] }>((r) => {
      resolveList = r;
    });
    mockApiFetch.mockImplementationOnce(() => listPromise);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const skeletons = document.querySelectorAll(
      '[class*="skeleton"], [data-slot="skeleton"], [class*="animate-pulse"]',
    );
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
    resolveList!({ items: [] });
    expect(await screen.findByText("暂无同步任务")).toBeInTheDocument();
  });

  it("EtlRulesPage_save_401_shows_error_no_success (T-ING-34)", async () => {
    setViewport(375);
    mockApiFetch
      .mockResolvedValueOnce({
        rules: [{ type: "rename_column", from: "a", to: "b" }],
      })
      .mockRejectedValueOnce(new Error("未授权"));
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/etl-rules"]}>
        <Routes>
          <Route
            path="/admin/ingestion/sync-jobs/:id/etl-rules"
            element={<EtlRulesPage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole("button", { name: "保存规则" });
    markEtlRulesDirty();
    fireEvent.click(screen.getByRole("button", { name: "保存规则" }));
    expect(await screen.findByText("未授权")).toBeInTheDocument();
    expect(screen.queryByText("已保存")).not.toBeInTheDocument();
  });

  it("SyncJobsPage_run_dialog_confirm_disables_controls_pending (T-ING-35)", async () => {
    setViewport(1400);
    let resolveRun: () => void;
    const runPromise = new Promise<void>((r) => {
      resolveRun = r;
    });
    mockApiFetch
      .mockResolvedValueOnce({
        items: [
          {
            id: "job-dialog-pending",
            name: "dialog-pending",
            source_type: "mysql",
            target_table: "t",
            enabled: true,
            schedule_cron: null,
          },
        ],
      })
      .mockImplementationOnce(() => runPromise);
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <Routes>
          <Route path="/admin/ingestion/sync-jobs" element={<SyncJobsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "手动运行同步" }));
    const dialog = await screen.findByRole("alertdialog");
    const runBtn = within(dialog).getByRole("button", { name: "运行" });
    fireEvent.click(runBtn);
    await waitFor(() => {
      expect(runBtn).toBeDisabled();
    });
    const cancelBtn = within(dialog).getByRole("button", { name: "取消" });
    expect(cancelBtn).toBeDisabled();
    resolveRun!();
  });
});
