import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TemplateCardPreview } from "./TemplateCardPreview";

vi.mock("./TemplateGridFitPreview", () => ({
  TemplateGridFitPreview: ({ children }: { children: ReactNode }) => (
    <div data-testid="template-grid-fit-host">{children}</div>
  ),
}));

vi.mock("@/components/dashboard/DashboardLayoutPreview", () => ({
  DashboardLayoutPreview: () => <div data-testid="dashboard-layout-preview-mock" />,
}));

vi.mock("@/components/dashboard/screen/DataScreenPresenter", () => ({
  DataScreenPresenter: () => <div data-testid="data-screen-presenter-mock" />,
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
    expect(screen.getByTestId("template-card-live-preview")).toBeInTheDocument();
    expect(screen.getByTestId("template-grid-fit-host")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-layout-preview-mock")).toBeInTheDocument();
  });
});
