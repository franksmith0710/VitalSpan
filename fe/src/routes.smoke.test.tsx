import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "./routes";

const mockApiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

function setDesktopViewport() {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1400,
  });
  window.dispatchEvent(new Event("resize"));
}

function setMobileViewport(width = 375) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("AppRoutes smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nested sync-jobs route through AdminLayout (T-FE-11, T-FE-17)", async () => {
    setDesktopViewport();
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("navigation").length).toBeGreaterThanOrEqual(1);
    const main = screen.getAllByRole("main")[0];
    expect(
      within(main).getByRole("heading", { level: 1, name: "同步任务" }),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton in nested sync-jobs route (T-FE-12)", async () => {
    setDesktopViewport();
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const main = screen.getAllByRole("main")[0];
    await waitFor(() => {
      const skeletons = main.querySelectorAll(
        '[class*="skeleton"], [data-slot="skeleton"], [class*="animate-pulse"]',
      );
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders AdminLayout at /admin with VitalSpan logo (T-FE-01)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("VitalSpan").length).toBeGreaterThanOrEqual(1);
  });

  it("renders main content area at /admin (T-FE-03)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("main").length).toBeGreaterThanOrEqual(1);
  });

  it("shows AdminHomePage welcome heading at /admin (T-FE-04)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(
      screen.getAllByRole("heading", { name: "欢迎使用 VitalSpan" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("redirects unknown paths to admin shell (T-FE-05)", () => {
    render(
      <MemoryRouter initialEntries={["/unknown-route-xyz"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("VitalSpan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("main").length).toBeGreaterThanOrEqual(1);
  });

  it("renders datasource nav link pointing to /admin (T-FE-08)", () => {
    setDesktopViewport();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole("link", { name: "数据源" });
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute("href", "/admin");
  });

  it("shows 数据接入 nav link at /admin (T-FE-19)", () => {
    setDesktopViewport();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "数据接入" });
    expect(link).toHaveAttribute("href", "/admin/ingestion/sync-jobs");
  });

  it("renders AdminHome welcome as h1 (T-FE-09)", () => {
    setDesktopViewport();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const main = screen.getAllByRole("main")[0];
    expect(
      within(main).getByRole("heading", { level: 1, name: "欢迎使用 VitalSpan" }),
    ).toBeInTheDocument();
  });

  it("renders sync-jobs history nested route (T-FE-ING-01)", async () => {
    setDesktopViewport();
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/history"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const main = screen.getAllByRole("main")[0];
    expect(within(main).getByRole("heading", { level: 1, name: "运行历史" })).toBeInTheDocument();
  });

  it("renders sync-jobs etl-rules nested route (T-FE-ING-02)", async () => {
    setDesktopViewport();
    mockApiFetch.mockResolvedValueOnce({ rules: [] });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/etl-rules"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const main = screen.getAllByRole("main")[0];
    await waitFor(() => {
      expect(within(main).getByRole("button", { name: /保存规则/ })).toBeInTheDocument();
    });
  });

  it("renders sync-jobs edit nested route (T-FE-ING-03)", async () => {
    setDesktopViewport();
    mockApiFetch.mockResolvedValueOnce({
      name: "demo",
      source: {
        type: "mysql",
        host: "127.0.0.1",
        port: 3307,
        database: "sample_db",
        username: "sample",
        password: "***",
        table: "dirty_orders",
      },
      target_table: "orders_clean",
      schedule_cron: null,
    });
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/sync-jobs/job-1/edit"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const main = screen.getAllByRole("main")[0];
    await waitFor(() => {
      expect(within(main).getByRole("heading", { level: 1, name: "编辑同步任务" })).toBeInTheDocument();
    });
  });

  it("renders admin shell at mobile 375px (T-FE-23)", () => {
    setMobileViewport(375);
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("VitalSpan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("main").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: "打开菜单" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("admin shell tab smoke at /admin (T-FE-27)", async () => {
    setDesktopViewport();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const menuBtn = screen.getAllByRole("button", { name: "打开菜单" })[0];
    const themeBtn = screen.getAllByRole("button", { name: "切换深浅色主题" })[0];
    let focusable = false;
    for (let i = 0; i < 40; i++) {
      await user.tab();
      if (
        document.activeElement === menuBtn ||
        document.activeElement === themeBtn
      ) {
        focusable = true;
        break;
      }
    }
    expect(focusable).toBe(true);
  });

  it("keeps admin shell for unknown /admin/* path without API leak (T-FE-28)", () => {
    setDesktopViewport();
    render(
      <MemoryRouter initialEntries={["/admin/nonexistent-secret"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("VitalSpan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("main").length).toBeGreaterThanOrEqual(1);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it("nested unknown ingestion path stays inside AdminLayout (T-FE-29)", () => {
    setDesktopViewport();
    render(
      <MemoryRouter initialEntries={["/admin/ingestion/unknown"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("VitalSpan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("main").length).toBeGreaterThanOrEqual(1);
  });

  it("renders dashboards list route (T-DASH-R28-002-04)", async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [] });
    render(
      <MemoryRouter initialEntries={["/admin/dashboards"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});
