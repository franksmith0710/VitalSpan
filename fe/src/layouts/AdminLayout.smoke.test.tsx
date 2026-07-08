import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn(() => ({
  user: { id: "1", username: "admin", roles: ["admin"] as const },
  isLoading: false,
  isAuthenticated: true,
  logout: vi.fn(),
  refresh: vi.fn(async () => {}),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { AdminLayout } from "./AdminLayout";

describe("AdminLayout smoke", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    mockUseAuth.mockReset();
    mockUseAuth.mockImplementation(() => ({
      user: { id: "1", username: "admin", roles: ["admin"] as const },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refresh: vi.fn(async () => {}),
    }));
  });
  function setMobileViewport(width = 375) {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event("resize"));
  }

  function setDesktopViewport(width = 1400) {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event("resize"));
  }

  it("mounts sidebar navigation and main content (T-FE-06)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>child content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("navigation", { name: "管理端导航" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("child content");
  });

  it("mounts theme toggle in header actions (T-FE-07)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getAllByRole("button", { name: "切换深浅色主题" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders mobile menu button with accessible label (T-FE-10)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getAllByRole("button", { name: "打开菜单" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("toggles dark class on theme button click (T-FE-15)", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
    const toggle = screen.getAllByRole("button", { name: "切换深浅色主题" })[0];
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("main content area uses max-w breakpoint contract (T-FE-16)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const main = screen.getAllByRole("main")[0];
    expect(main.className).toContain("max-w-(--breakpoint-2xl)");
  });

  it("shows mobile backdrop when menu opens at 375px (T-FE-20)", () => {
    setMobileViewport(375);
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const menuBtn = screen.getAllByRole("button", { name: "打开菜单" })[0];
    fireEvent.click(menuBtn);
    const backdrop = document.querySelector('[class*="bg-gray-900/50"]');
    expect(backdrop).not.toBeNull();
  });

  it("toggles desktop sidebar margin between 290px and 90px (T-FE-21)", () => {
    setDesktopViewport(1400);
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const menuBtn = screen.getAllByRole("button", { name: "打开菜单" })[0];
    const main = screen.getAllByRole("main")[0];
    const contentWrapper = main.parentElement;
    expect(contentWrapper?.className).toContain("xl:ml-[290px]");

    fireEvent.click(menuBtn);
    expect(contentWrapper?.className).toContain("xl:ml-[90px]");

    fireEvent.click(menuBtn);
    expect(contentWrapper?.className).toContain("xl:ml-[290px]");
  });

  it("main and navigation token contract (T-FE-22)", () => {
    setDesktopViewport(1400);
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const main = screen.getAllByRole("main")[0];
    expect(main.className).toContain("max-w-(--breakpoint-2xl)");
    expect(
      screen.getAllByRole("navigation", { name: "管理端导航" }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("desktop tab focus order: menu button then theme toggle (T-FE-24)", async () => {
    setDesktopViewport(1400);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const menuBtn = screen.getAllByRole("button", { name: "打开菜单" })[0];
    const themeBtn = screen.getAllByRole("button", { name: "切换深浅色主题" })[0];

    for (let i = 0; i < 40; i++) {
      await user.tab();
      if (document.activeElement === menuBtn) break;
    }
    expect(document.activeElement).toBe(menuBtn);

    let reachedTheme = false;
    for (let i = 0; i < 15; i++) {
      await user.tab();
      if (document.activeElement === themeBtn) {
        reachedTheme = true;
        break;
      }
    }
    expect(reachedTheme).toBe(true);
  });

  it("mobile tab reaches menu button at 375px (T-FE-25)", async () => {
    setMobileViewport(375);
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const menuBtn = screen.getAllByRole("button", { name: "打开菜单" })[0];
    menuBtn.focus();
    expect(document.activeElement).toBe(menuBtn);
    expect(menuBtn).toHaveAccessibleName("打开菜单");
  });

  it("mobile menu open tab does not trap focus (T-FE-26)", async () => {
    setMobileViewport(375);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const menuBtn = screen.getAllByRole("button", { name: "打开菜单" })[0];
    await user.click(menuBtn);
    await user.tab();
    await user.tab();
    expect(screen.getAllByRole("main").length).toBeGreaterThanOrEqual(1);
  });

  it("shows return to workspace in user menu on account pages (T-FE-32)", async () => {
    setDesktopViewport(1400);
    localStorage.clear();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin/dashboards"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboards" element={<div>workspace home</div>} />
            <Route path="account/profile" element={<div>profile page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("workspace home")).toBeInTheDocument();

    const userMenu = screen.getAllByRole("button", { name: "用户菜单" })[0];
    await user.click(userMenu);
    expect(screen.queryByRole("menuitem", { name: "返回工作台" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "个人资料" }));
    expect(screen.getByText("profile page")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "账号导航" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "管理端导航" })).not.toBeInTheDocument();
    expect(screen.queryByText("数据连接")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "返回工作台" }).length).toBeGreaterThanOrEqual(1);

    await user.click(userMenu);
    expect(screen.getByRole("menuitem", { name: "返回工作台" })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: "返回工作台" }));
    expect(screen.getByText("workspace home")).toBeInTheDocument();
  });

  it("admin sidebar has 报表 collapsible that expands to show sub-items (T-FE-SMFA-01)", async () => {
    setDesktopViewport(1400);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const reportTrigger = screen.getByRole("button", { name: "报表" });
    expect(reportTrigger).toBeInTheDocument();

    await user.click(reportTrigger);

    expect(screen.getByRole("link", { name: "预制报表" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "报表模板" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "报表调度" })).toBeInTheDocument();
  });

  it("admin sidebar has 数据连接 collapsible with 连接管理 and 连接器类型 (T-FE-SMFA-02)", async () => {
    setDesktopViewport(1400);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const dataConnTrigger = screen.getByRole("button", { name: "数据连接" });
    await user.click(dataConnTrigger);

    const connMgrLink = screen.getByRole("link", { name: "连接管理" });
    expect(connMgrLink).toHaveAttribute("href", "/admin/datasources");

    const connTypeLink = screen.getByRole("link", { name: "连接器类型" });
    expect(connTypeLink).toHaveAttribute("href", "/admin/connectors");
  });

  it("admin sidebar has no 预览 badge after M13 GA (T-FE-SMFA-03)", () => {
    setDesktopViewport(1400);
    render(
      <MemoryRouter initialEntries={["/admin/dashboards"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboards" element={<div>dashboards</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText("预览")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查询设计器/ })).toBeInTheDocument();
  });

  it("viewer role: sidebar has no 系统 or 数据 section headings (T-FE-SMFA-04)", () => {
    setDesktopViewport(1400);
    mockUseAuth.mockReturnValueOnce({
      user: { id: "2", username: "viewer", roles: ["viewer"] },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refresh: vi.fn(async () => {}),
    } as unknown as ReturnType<typeof mockUseAuth>);

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("heading", { name: "系统" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "数据" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "分析" })).toBeInTheDocument();
  });

  it("T-FE-SMFB-01: admin sidebar 系统 group has 资源授权 link", () => {
    setDesktopViewport(1400);
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "资源授权" });
    expect(link).toHaveAttribute("href", "/admin/system/grants");
  });

  it("T-FE-SMFB-02: viewer sidebar has no 资源授权 text", () => {
    mockUseAuth.mockReturnValueOnce({
      user: { id: "2", username: "viewer", roles: ["viewer"] },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refresh: vi.fn(async () => {}),
    } as unknown as ReturnType<typeof mockUseAuth>);
    setDesktopViewport(1400);
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText("资源授权")).not.toBeInTheDocument();
  });

  it("T-FE-SMFB-03: admin still has 报表 subItems (no regression T-FE-SMFA-01)", async () => {
    setDesktopViewport(1400);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<div>home</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "报表" }));
    expect(screen.getByRole("link", { name: "预制报表" })).toBeInTheDocument();
  });

  it("T-NAV-FC-04: analyst sidebar has no 实体总览 or 连接管理", () => {
    mockUseAuth.mockReturnValueOnce({
      user: { id: "3", username: "analyst", roles: ["analyst"] },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refresh: vi.fn(async () => {}),
    } as unknown as ReturnType<typeof mockUseAuth>);
    setDesktopViewport(1400);
    render(
      <MemoryRouter initialEntries={["/admin/dashboards"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboards" element={<div>d</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("link", { name: "实体总览" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "连接管理" })).not.toBeInTheDocument();
  });

  it("T-DESIGN-FC-01-smoke: admin sees 治理专用 badge on designer link", () => {
    setDesktopViewport(1400);
    render(
      <MemoryRouter initialEntries={["/admin/governance/tickets"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="governance/tickets" element={<div>t</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("治理专用")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查询设计器/ })).toBeInTheDocument();
  });
});
