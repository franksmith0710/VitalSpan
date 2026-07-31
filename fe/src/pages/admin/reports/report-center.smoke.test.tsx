import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportCenterPage } from "./ReportCenterPage";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", roles: ["admin"], isRoot: true },
    isAuthenticated: true,
  }),
}));

vi.mock("@/lib/defaultViewResolve", () => ({
  resolveDefaultReportTemplateNodeId: vi.fn().mockResolvedValue(null),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter>
          <ReportCenterPage />
        </MemoryRouter>
      </TooltipProvider>
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
    expect(await screen.findByText("全部报表")).toBeInTheDocument();
    expect(await screen.findByText("月报模板")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开并运行" })).toHaveAttribute("href", "/admin/reports/view/tpl-1");
  });

  it("shows quick links for admin", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("报表模板")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /报表调度/ })).toHaveAttribute("href", "/admin/reports/schedules");
    expect(screen.getByRole("link", { name: /看板定时报告/ })).toHaveAttribute(
      "href",
      "/admin/reports/schedules?tab=dashboard",
    );
  });

  it("filters templates by search query", async () => {
    renderPage();
    expect(await screen.findByText("月报模板")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("搜索报表"), "不存在");
    expect(screen.getByText("无匹配报表")).toBeInTheDocument();
  });

  it("lists prefab bindings section", async () => {
    renderPage();
    expect(await screen.findByText("预制分析")).toBeInTheDocument();
    expect(screen.getByText("预制A")).toBeInTheDocument();
  });

  it("prefab run links to binding deep-link on prefab page", async () => {
    renderPage();
    expect(await screen.findByText("预制A")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "运行 预制A" })).toHaveAttribute("href", "/admin/reports?binding=k1");
  });
});
