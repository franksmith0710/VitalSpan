import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TemplateCardPreview } from "./TemplateCardPreview";

vi.mock("./TemplateLayoutLivePreview", () => ({
  TemplateLayoutLivePreview: ({
    demoDatasourceMissing,
  }: {
    demoDatasourceMissing?: boolean;
  }) => (
    <div data-testid="template-layout-live-preview" data-demo-missing={String(demoDatasourceMissing)}>
      live preview
    </div>
  ),
}));

vi.mock("@/components/charts/engine/d3/core/animate", () => ({
  setChartAnimationSuppressed: vi.fn(),
}));

vi.mock("@/lib/dashboardTemplates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dashboardTemplates")>();
  return {
    ...actual,
    fetchTemplateDetail: vi.fn(async () => ({
      id: "tpl-1",
      templateKey: "builtin-dash-dual-kpi",
      name: "双栏 KPI",
      description: "测试",
      categoryKey: "analytics",
      surfaceKind: "dashboard" as const,
      status: "published" as const,
      thumbnailRef: null,
      visibility: "builtin" as const,
      contentRevision: 1,
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      layoutJson: {
        version: 1,
        widgets: [
          {
            id: "w1",
            type: "chart",
            title: "渠道",
            order: 0,
            colSpan: 6,
            rowSpan: 4,
            gridX: 0,
            gridY: 0,
            chartConfig: {
              chartId: "w1",
              chartType: "bar",
              mode: "sql",
              sql: "SELECT 1",
              dataSourceId: "__demo:sample_db__",
            },
          },
        ],
        globalFilters: [],
      },
      sourceDashboardId: null,
      ownerUserId: null,
      orgScope: null,
      createdAt: new Date().toISOString(),
    })),
  };
});

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async () => ({ items: [] })),
}));

afterEach(cleanup);

function renderPreview() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <div style={{ width: 320, height: 200 }}>
        <TemplateCardPreview
          templateId="tpl-1"
          surfaceKind="dashboard"
          categoryKey="analytics"
          visibility="builtin"
          status="published"
          eager
          className="h-full"
        />
      </div>
    </QueryClientProvider>,
  );
}

describe("TemplateCardPreview", () => {
  it("loads template detail and renders live layout preview", async () => {
    renderPreview();
    await waitFor(() => {
      expect(screen.getByTestId("template-card-preview")).toHaveAttribute("data-live", "true");
    });
    expect(screen.getByTestId("template-layout-live-preview")).toBeInTheDocument();
  });

  it("renders meta bar at top of preview shell", async () => {
    renderPreview();
    await waitFor(() => {
      expect(screen.getByTestId("template-card-preview")).toHaveAttribute("data-live", "true");
    });
    expect(screen.getByText("仪表板")).toBeInTheDocument();
    expect(screen.getByText("分析 · 内置")).toBeInTheDocument();
  });

  it("flags missing demo datasource for templates that require charts", async () => {
    renderPreview();
    await waitFor(() => {
      expect(screen.getByTestId("template-layout-live-preview")).toHaveAttribute(
        "data-demo-missing",
        "true",
      );
    });
  });
});
