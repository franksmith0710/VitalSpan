import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { TemplatePreviewDialog } from "./TemplatePreviewDialog";

vi.mock("@/components/dashboard/DashboardLayoutPreview", () => ({
  DashboardLayoutPreview: () => <div data-testid="dashboard-layout-preview-mock" />,
}));

vi.mock("@/components/dashboard/screen/DataScreenPresenter", () => ({
  DataScreenPresenter: () => <div data-testid="data-screen-presenter-mock" />,
}));

vi.mock("@/lib/dashboardTemplates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dashboardTemplates")>();
  return {
    ...actual,
    fetchTemplateDetail: vi.fn(async () => ({
      id: "tpl-1",
      templateKey: "builtin-dash-dual-kpi",
      name: "双栏 KPI",
      description: "测试描述",
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
  apiFetch: vi.fn(async () => ({ items: [{ id: "ds-1", name: "sample_db", code: "sample_db" }] })),
}));

function renderDialog(open = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const item = {
    id: "tpl-1",
    templateKey: "builtin-dash-dual-kpi",
    name: "双栏 KPI",
    description: "测试描述",
    categoryKey: "analytics",
    surfaceKind: "dashboard" as const,
    status: "published" as const,
    thumbnailRef: null,
    visibility: "builtin" as const,
    contentRevision: 1,
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  };
  return render(
    <QueryClientProvider client={client}>
      <TemplatePreviewDialog open={open} onOpenChange={() => {}} item={item} />
    </QueryClientProvider>,
  );
}

describe("TemplatePreviewDialog", () => {
  it("loads template and renders live preview in dialog", async () => {
    renderDialog();
    const dialog = screen.getByTestId("template-preview-dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog.className).toMatch(/sm:max-w-\[min\(98vw,1680px\)\]/);
    await waitFor(() => {
      expect(screen.getByTestId("template-layout-live-preview")).toBeInTheDocument();
    });
    expect(screen.getByTestId("dashboard-layout-preview-mock")).toBeInTheDocument();
    expect(screen.getByTestId("template-layout-live-preview")).toHaveAttribute(
      "data-preview-variant",
      "dialog",
    );
  });
});
