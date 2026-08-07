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
  apiFetch: vi.fn(async () => ({
    items: [{ id: "ds-1", name: "官方演示库", code: "demo", database: "sample_db" }],
  })),
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

  it("flags missing demo datasource for templates that require charts", async () => {
    const { apiFetch } = await import("@/lib/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({ items: [] });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <div style={{ width: 320, height: 200 }}>
          <TemplateCardPreview
            templateId="tpl-1"
            surfaceKind="dashboard"
            thumbnailSrc="/template-assets/packs/de-dashboard-v1/thumbs/gov-efficiency.svg"
            eager
            className="h-full"
          />
        </div>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("template-card-preview")).toHaveAttribute("data-live", "false");
    });
    expect(screen.queryByTestId("template-layout-live-preview")).not.toBeInTheDocument();
  });

  it("renders live preview when thumbnail exists and demo datasource is available", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <div style={{ width: 320, height: 200 }}>
          <TemplateCardPreview
            templateId="tpl-1"
            surfaceKind="dashboard"
            thumbnailSrc="/template-assets/packs/de-dashboard-v1/thumbs/gov-efficiency.svg"
            eager
            className="h-full"
          />
        </div>
      </QueryClientProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("template-card-preview")).toHaveAttribute("data-live", "true");
    });
    expect(screen.getByTestId("template-layout-live-preview")).toBeInTheDocument();
  });
});
