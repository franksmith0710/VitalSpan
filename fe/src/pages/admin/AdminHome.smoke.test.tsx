import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockResolve = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/lib/defaultViewResolve", () => ({
  resolveDefaultDashboardPath: (...args: unknown[]) => mockResolve(...args),
}));

vi.mock("@/context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

import { AdminHomePage } from "./AdminHomePage";

describe("AdminHomePage smoke", () => {
  beforeEach(() => {
    mockResolve.mockReset();
    mockUseAuth.mockReturnValue({
      user: { id: "1", username: "admin", roles: ["admin"] },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refresh: vi.fn(async () => {}),
    });
  });

  afterEach(() => cleanup());

  it("renders shell preview card with form controls (T-FE-13)", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminHomePage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "壳层预览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "主操作示例" })).toBeInTheDocument();
    expect(screen.getByLabelText("示例输入")).toBeInTheDocument();
  });

  it("shows welcome copy for M1 shell (T-FE-14)", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminHomePage />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "欢迎使用 VitalSpan" })).toBeInTheDocument();
  });

  it("T-VIEW-003-01: viewer redirects to default dashboard", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "2", username: "viewer1", roles: ["viewer"] },
      isLoading: false,
      isAuthenticated: true,
      logout: vi.fn(),
      refresh: vi.fn(async () => {}),
    });
    mockResolve.mockResolvedValue("/admin/dashboards/d-viewer");

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/admin/dashboards/:id" element={<div>Dashboard 消费页</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard 消费页")).toBeInTheDocument();
    });
    expect(mockResolve).toHaveBeenCalledWith(["viewer"]);
  });
});
