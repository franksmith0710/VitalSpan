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
    mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path.startsWith("/api/v1/reports/schedules")) {
        return {
          items: [
            {
              id: "sched-1",
              sourceType: "dashboard",
              sourceId: "d1",
              sourceLabel: "销售看板",
              cron: "0 8 * * *",
              timezone: "Asia/Shanghai",
              status: "scheduled",
              allowedActions: ["pause"],
              recipients: [{ type: "email", value: "ops@example.com" }],
              attachmentFormats: ["pdf"],
            },
          ],
          total: 1,
        };
      }
      if (path.includes("/executions/recent-failures")) {
        return { items: [], total: 0 };
      }
      if (path === "/api/v1/reports/catalog/templates/readiness" && init?.method === "POST") {
        return { items: [{ nodeId: "tpl-1", readiness: "demo" }] };
      }
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
      if (path === "/api/v1/reports/center/preferences") {
        return {
          favorites: [],
          recent: [
            {
              resourceType: "template",
              resourceId: "tpl-1",
              resourceLabel: "月报模板",
            },
          ],
        };
      }
      return { items: [], total: 0 };
    });
  });
  afterEach(() => cleanup());

  it("renders schedule-first hub title and dashboard schedule", async () => {
    renderPage();
    expect(await screen.findByText("报表中心")).toBeInTheDocument();
    expect(await screen.findByText("销售看板")).toBeInTheDocument();
    expect(screen.getByText("从看板/大屏创建")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /从看板\/大屏创建/i }).closest("a")).toHaveAttribute(
      "href",
      "/admin/dashboards?intent=schedule",
    );
  });

  it("shows admin overview shortcuts", async () => {
    renderPage();
    expect(await screen.findByText("销售看板")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "文档模板" })).toHaveAttribute("href", "/admin/reports/templates");
    expect(screen.getByRole("link", { name: "管理全部定时报告" })).toHaveAttribute(
      "href",
      "/admin/reports/schedules?tab=dashboard",
    );
    expect(screen.queryByRole("link", { name: "定时报告" })).not.toBeInTheDocument();
  });

  it("expands document templates section on click", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByTestId("report-center-templates-toggle")).toBeInTheDocument();
    await user.click(screen.getByTestId("report-center-templates-toggle"));
    expect(screen.getByRole("link", { name: "运行" })).toHaveAttribute("href", "/admin/reports/view/tpl-1");
  });

  it("lists prefab bindings section", async () => {
    renderPage();
    expect(await screen.findByTestId("report-center-prefab-heading")).toBeInTheDocument();
    expect(await screen.findByText("预制A")).toBeInTheDocument();
  });

  it("prefab run links to binding deep-link on prefab page", async () => {
    renderPage();
    expect(await screen.findByText("预制A")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "运行 预制A" })).toHaveAttribute("href", "/admin/reports?binding=k1");
  });

  it("recent views link to resource pages", async () => {
    renderPage();
    expect(await screen.findByText("最近访问")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /月报模板/ })).toHaveAttribute(
      "href",
      "/admin/reports/view/tpl-1",
    );
  });

  it("shows empty dashboard schedule hint when none exist", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/v1/reports/schedules")) return { items: [], total: 0 };
      if (path.includes("/executions/recent-failures")) return { items: [], total: 0 };
      if (path === "/api/v1/reports/prefab/bindings") return { items: [], total: 0 };
      if (path.startsWith("/api/v1/reports/catalog/nodes")) return [];
      return { items: [], total: 0 };
    });
    renderPage();
    expect(await screen.findByText(/暂无看板\/大屏定时报告/)).toBeInTheDocument();
  });
});
