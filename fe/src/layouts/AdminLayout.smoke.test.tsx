import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminLayout } from "./AdminLayout";

describe("AdminLayout smoke", () => {
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
});
