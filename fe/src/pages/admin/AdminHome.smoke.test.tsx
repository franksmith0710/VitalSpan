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
    mockResolve.mockResolvedValue("/admin/dashboards");
  });

  afterEach(() => cleanup());

  it("T-FE-14: admin redirects to default dashboards list", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminHomePage />} />
          <Route path="/admin/dashboards" element={<div>仪表板列表</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("仪表板列表")).toBeInTheDocument();
    });
    expect(mockResolve).toHaveBeenCalledWith(["admin"]);
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
          <Route path="/admin/dashboards/:id" element={<div>仪表板消费页</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("仪表板消费页")).toBeInTheDocument();
    });
    expect(mockResolve).toHaveBeenCalledWith(["viewer"]);
  });
});
