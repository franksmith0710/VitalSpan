import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataScreenListPage } from "./DataScreenListPage";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", roles: ["admin"], isRoot: true },
    isAuthenticated: true,
  }),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DataScreenListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DataScreenListPage smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
  });
  afterEach(() => cleanup());

  it("renders title and empty state", async () => {
    mockApiFetch.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    renderPage();
    expect(await screen.findByText("数据大屏")).toBeInTheDocument();
    expect(await screen.findByText("暂无数据大屏")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /新建大屏/ }).length).toBeGreaterThan(0);
    });
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("surfaceKind=data-screen"),
    );
  });
});
