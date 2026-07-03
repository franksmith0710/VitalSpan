import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import * as ReactRouter from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
});
