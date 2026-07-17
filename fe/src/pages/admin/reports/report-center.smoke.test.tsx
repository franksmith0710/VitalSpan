import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportCenterPage } from "./ReportCenterPage";

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
        <ReportCenterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ReportCenterPage smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/reports/prefab/bindings") {
        return { items: [{ bindingKey: "k1", displayName: "预制A", analysisType: "lifecycle" }], total: 1 };
      }
      if (path.startsWith("/api/v1/reports/catalog/nodes")) {
        return [
          {
            id: "tpl-1",
            name: "月报模板",
            parentId: null,
            nodeType: "template",
            templateKind: "pdf",
            templateKey: "monthly",
            sortOrder: 0,
          },
        ];
      }
      return { items: [], total: 0 };
    });
  });
  afterEach(() => cleanup());

  it("renders hub title and template card", async () => {
    renderPage();
    expect(await screen.findByText("报表中心")).toBeInTheDocument();
    expect(await screen.findByText("月报模板")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /查看/i })).toHaveAttribute("href", "/admin/reports/view/tpl-1");
  });

  it("shows quick links for admin", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("报表模板")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /报表调度/ })).toHaveAttribute("href", "/admin/reports/schedules");
  });
});
