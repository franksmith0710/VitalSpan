import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportSchedulesPage } from "./ReportSchedulesPage";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter>
          <ReportSchedulesPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("ReportSchedulesPage smoke", () => {
  const scheduleId = "sched-1";
  const nodeId = "node-1";

  beforeEach(() => {
    mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/reports/schedules") {
        return {
          items: [
            {
              id: scheduleId,
              catalogNodeId: nodeId,
              sourceType: "template",
              sourceId: nodeId,
              cron: "0 8 * * *",
              timezone: "Asia/Shanghai",
              status: "scheduled",
              allowedActions: ["pause"],
              recipients: [{ type: "role", value: "admin" }],
              attachmentFormats: ["pdf"],
            },
          ],
          total: 1,
        };
      }
      if (path.startsWith("/api/v1/reports/catalog/nodes")) {
        return [
          {
            id: nodeId,
            name: "销售月报",
            parentId: null,
            nodeType: "template",
            templateKind: "pdf",
            templateKey: "sales",
            sortOrder: 0,
          },
        ];
      }
      if (path.includes("/executions")) {
        return {
          items: [
            {
              executionId: "ex-1",
              scheduleId,
              status: "semi_real_failed",
              artifactRef: "semi://x",
              executedAt: "2026-07-07T00:00:00Z",
              errorMessage: "邮件投递不可用",
            },
          ],
          total: 1,
        };
      }
      if (path.includes("/retry") && init?.method === "POST") {
        return { executionId: "ex-2", status: "pending" };
      }
      return {};
    });
  });
  afterEach(() => cleanup());

  it("lists schedules with template name and frequency label", async () => {
    renderPage();
    expect(await screen.findByText("销售月报")).toBeInTheDocument();
    expect(screen.getByText("每天 08:00")).toBeInTheDocument();
    expect(screen.getAllByText("模板").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/角色:管理员/)).toBeInTheDocument();
  });

  it("shows create entry links and tab filters", async () => {
    renderPage();
    expect(await screen.findByRole("link", { name: /从模板创建/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /从看板创建/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "看板/大屏" })).toBeInTheDocument();
  });

  it("expands history and shows retry", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("销售月报");
    await user.click(screen.getByRole("button", { name: "销售月报" }));
    expect(await screen.findByText("重试")).toBeInTheDocument();
    expect(screen.getByText("邮件投递不可用")).toBeInTheDocument();
  });
});
