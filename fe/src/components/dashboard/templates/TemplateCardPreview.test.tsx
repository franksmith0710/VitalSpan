import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TemplateCardPreview } from "./TemplateCardPreview";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async (url: string) => {
    if (url === "/api/v1/dashboard-templates/tpl-1") {
      return {
        id: "tpl-1",
        templateKey: "builtin-dash-blank",
        name: "空白看板",
        description: "测试",
        categoryKey: "general",
        surfaceKind: "dashboard",
        status: "published",
        thumbnailRef: null,
        visibility: "builtin",
        contentRevision: 1,
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        layoutJson: {
          version: 1,
          widgets: [
            {
              id: "w1",
              type: "text",
              title: "占位",
              order: 0,
              colSpan: 6,
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
    throw new Error(`unexpected ${url}`);
  }),
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
  it("loads template detail and renders layout thumb", async () => {
    renderPreview();
    await waitFor(() => {
      expect(screen.getByTestId("template-card-preview")).toHaveAttribute("data-live", "true");
    });
    expect(screen.getByTestId("dashboard-preview-thumb")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-preview-widget-w1")).toBeInTheDocument();
  });

  it("renders thumbnail image when thumbnailRef is set", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <QueryClientProvider client={client}>
        <div style={{ width: 320, height: 200 }}>
          <TemplateCardPreview
            templateId="tpl-2"
            thumbnailRef="/thumbs/demo.png"
            surfaceKind="dashboard"
            className="h-full"
          />
        </div>
      </QueryClientProvider>,
    );
    const img = container.querySelector('img[src="/thumbs/demo.png"]');
    expect(img).not.toBeNull();
  });
});
