import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { VizTemplatesHubPage } from "./VizTemplatesHubPage";

vi.mock("@/lib/exportLayoutJson", () => ({
  downloadJsonFile: vi.fn(),
}));

import { downloadJsonFile } from "@/lib/exportLayoutJson";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { username: "admin", roles: ["admin"], permissions: [] },
  }),
}));

const mockTemplateItem = {
  id: "tpl-1",
  templateKey: "builtin-dash-dual-kpi",
  name: "双栏 KPI 分析",
  description: "KPI 条 + 渠道柱图 / 趋势折线，演示库即开即用",
  categoryKey: "analytics",
  surfaceKind: "dashboard" as const,
  status: "published" as const,
  thumbnailRef: null,
  visibility: "builtin" as const,
  contentRevision: 1,
  updatedAt: new Date().toISOString(),
  publishedAt: new Date().toISOString(),
};

const mockExportEnvelope = {
  templateVersion: 1,
  kind: "viz-layout",
  surfaceKind: "dashboard",
  name: "双栏 KPI 分析",
  layout: { version: 1, widgets: [], globalFilters: [] },
};

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/v1/dashboard-templates?")) {
      return {
        items: [
          mockTemplateItem,
          {
            id: "tpl-blank",
            templateKey: "builtin-dash-blank",
            name: "空白看板",
            description: "12 列栅格画布，从零搭建",
            categoryKey: "general",
            surfaceKind: "dashboard",
            status: "published",
            thumbnailRef: null,
            visibility: "builtin",
            contentRevision: 1,
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
          },
        ],
        total: 2,
        limit: 100,
        offset: 0,
      };
    }
    if (url === "/api/v1/dashboard-templates/tpl-1") {
      return {
        ...mockTemplateItem,
        layoutJson: {
          version: 1,
          widgets: [
            {
              id: "w1",
              type: "text",
              title: "占位",
              order: 0,
              colSpan: 12,
              rowSpan: 2,
            },
          ],
          globalFilters: [],
        },
        sourceDashboardId: null,
        ownerUserId: null,
        orgScope: null,
        createdAt: new Date().toISOString(),
      };
    }
    if (url === "/api/v1/dashboard-templates/tpl-1/export") {
      return mockExportEnvelope;
    }
    if (url === "/api/v1/datasources") {
      return { items: [] };
    }
    if (url === "/api/v1/demo-package/status") {
      return {
        ready: true,
        mysqlReachable: true,
        schemaVersion: 3,
        datasourceId: "ds-demo",
        datasourceCode: "demo",
        demoDashboardIds: ["d1", "d2", "d3"],
        message: null,
      };
    }
    if (url === "/api/v1/dashboards/from-template" && init?.method === "POST") {
      return { id: "dash-new" };
    }
    throw new Error(`unexpected ${url}`);
  }),
}));

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter>
          <VizTemplatesHubPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

function hubFilters() {
  const nodes = screen.getAllByTestId("viz-templates-hub-filters");
  return nodes[nodes.length - 1]!;
}

describe("VizTemplatesHubPage smoke", () => {
  it("renders hub title, tabs and template card", async () => {
    renderHub();
    expect(screen.getByRole("heading", { name: "可视化模板" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /仪表板/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /数据大屏/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /导入 JSON/ })).toBeInTheDocument();
    expect(await screen.findByText("双栏 KPI 分析")).toBeInTheDocument();
    expect(screen.queryByText("空白看板")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "使用模板" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "双栏 KPI 分析 更多操作" })).toBeInTheDocument();
  });

  it("shows demo package ready banner", async () => {
    renderHub();
    expect(await screen.findByText("官方演示数据已就绪")).toBeInTheDocument();
    expect(screen.getAllByText(/模板预览将使用「示例数据」/).length).toBeGreaterThan(0);
  });

  it("exports template json from card menu", async () => {
    const user = userEvent.setup();
    const downloadMock = vi.mocked(downloadJsonFile);
    downloadMock.mockClear();
    renderHub();
    const [card] = await screen.findAllByTestId("viz-template-card-tpl-1");
    await user.click(within(card).getByRole("button", { name: "双栏 KPI 分析 更多操作" }));
    await user.click(await screen.findByRole("menuitem", { name: "导出" }));
    await waitFor(() => {
      expect(downloadMock).toHaveBeenCalledWith(
        mockExportEnvelope,
        "双栏-KPI-分析-template.json",
      );
    });
  });

  it("opens preview dialog from card", async () => {
    const user = userEvent.setup();
    renderHub();
    const [card] = await screen.findAllByTestId("viz-template-card-tpl-1");
    await user.click(within(card).getByRole("button", { name: "预览" }));
    expect(await screen.findByTestId("template-preview-dialog")).toBeInTheDocument();
  });

  it("keeps surface tabs when 政务 category is selected", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderHub();
    await waitFor(() => {
      expect(within(hubFilters()).getByRole("tab", { name: /仪表板/ })).toBeInTheDocument();
    });
    await user.click(within(hubFilters()).getByRole("button", { name: "政务" }));
    await waitFor(() => {
      expect(within(hubFilters()).getByRole("button", { name: "政务" })).toHaveClass(/bg-brand-50/);
    });
    expect(within(hubFilters()).getByRole("tab", { name: /仪表板/ })).toBeInTheDocument();
    expect(within(hubFilters()).getByRole("tab", { name: /数据大屏/ })).toBeInTheDocument();
    expect(within(hubFilters()).queryByText("政务 · 大屏与看板")).not.toBeInTheDocument();
  });
});
