import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import * as ReactRouter from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EtlRulesPage } from "./EtlRulesPage";
import { SyncJobFormPage } from "./SyncJobFormPage";
import { SyncJobHistoryPage } from "./SyncJobHistoryPage";
import { SyncJobsPage } from "./SyncJobsPage";

const mockNavigate = vi.fn();
const mockApiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
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
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/v1/ingestion/sync-jobs/job-1/run",
        { method: "POST" },
      );
    });
  });

  it("SyncJobHistoryPage_shows_runs", async () => {
    setViewport(1400);
    mockApiFetch.mockResolvedValueOnce({
      items: [
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
    expect(await screen.findByText("成功")).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
  });

  it("SyncJobFormPage_create_submit", async () => {
    setViewport(375);
    mockApiFetch.mockResolvedValueOnce({ id: "new-job" });
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
      expect(mockNavigate).toHaveBeenCalledWith("/admin/ingestion/sync-jobs");
    });
  });

  it("SyncJobFormPage_blocks_submit_when_name_empty (T-ING-06)", async () => {
    setViewport(375);
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
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("SyncJobFormPage_password_field_is_masked (T-ING-07)", async () => {
    setViewport(1400);
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
    mockApiFetch.mockResolvedValueOnce({ items: [] });
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
    fireEvent.click(runBtn);
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
});
