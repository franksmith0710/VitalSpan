import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportCenterPage } from "./ReportCenterPage";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", roles: ["admin"], isRoot: true },
    isLoading: false,
    isAuthenticated: true,
    logout: vi.fn(),
    refresh: vi.fn(async () => {}),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={["/admin/reports/center"]}>
          <ReportCenterPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("ReportCenterPage smoke", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/reports/standard/packs") {
        return {
          items: [{ packKey: "k1", displayName: "标准A", enabledThemes: ["lifecycle"] }],
          total: 1,
        };
      }
      if (path === "/api/v1/reports/center/preferences") {
        return { favorites: [], recent: [] };
      }
      if (path.startsWith("/api/v1/reports/schedules")) {
        return { items: [], total: 0 };
      }
      if (path === "/api/v1/reports/catalog/nodes") {
        return { items: [], total: 0 };
      }
      if (path === "/api/v1/reports/catalog/templates/readiness" && init?.method === "POST") {
        return { items: [] };
      }
      throw new Error(`unmocked ${path}`);
    });
  });

  it("lists standard analysis section", async () => {
    renderPage();
    expect(await screen.findByTestId("report-center-standard-heading")).toBeInTheDocument();
    expect(await screen.findByText("标准A")).toBeInTheDocument();
  });

  it("standard link opens workbench", async () => {
    renderPage();
    expect(await screen.findByText("标准A")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开 标准A" })).toHaveAttribute(
      "href",
      "/admin/reports/standard?pack=k1",
    );
  });

  it("hides standard section when empty", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/reports/standard/packs") return { items: [], total: 0 };
      if (path === "/api/v1/reports/center/preferences") return { favorites: [], recent: [] };
      if (path.startsWith("/api/v1/reports/schedules")) return { items: [], total: 0 };
      if (path === "/api/v1/reports/catalog/nodes") return { items: [], total: 0 };
      throw new Error(`unmocked ${path}`);
    });
    renderPage();
    expect(await screen.findByTestId("admin-page-header-frame")).toBeInTheDocument();
    expect(screen.queryByTestId("report-center-standard-heading")).not.toBeInTheDocument();
  });
});
