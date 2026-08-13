import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardSchedulePanel } from "./components/DashboardSchedulePanel";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TooltipProvider delayDuration={0}>{ui}</TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("DashboardSchedulePanel embedded channels", () => {
  beforeEach(() => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.includes("/users")) return { items: [{ id: "u1", username: "admin" }] };
      if (path.includes("/schedules?") && !path.includes("/executions")) {
        return { items: [], total: 0 };
      }
      if (path.includes("/delivery-health")) {
        return { status: "unreachable", im: { dingtalk: { configured: false } } };
      }
      if (path.includes("/export-health")) return { status: "available" };
      return {};
    });
  });
  afterEach(() => cleanup());

  it("shows dingTalk/feishu and bind-account hint in dashboard dialog", async () => {
    render(
      wrap(
        <DashboardSchedulePanel
          sourceId="00000000-0000-4000-8000-000000000001"
          sourceType="dashboard"
          sourceName="政务效能分析看板"
          widgetCount={6}
          embedded
        />,
      ),
    );
    expect(await screen.findByText("投递方式")).toBeInTheDocument();
    expect(screen.getByText("钉钉")).toBeInTheDocument();
    expect(screen.getByText("企业微信")).toBeInTheDocument();
    expect(screen.getByText("飞书")).toBeInTheDocument();
    expect(screen.getByText("同时发到群")).toBeInTheDocument();
    expect(screen.getAllByText(/系统管理 → 用户/).length).toBeGreaterThan(0);
  });
});
