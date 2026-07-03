import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "./routes";

function setDesktopViewport() {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1400,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("AppRoutes smoke", () => {
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
});
