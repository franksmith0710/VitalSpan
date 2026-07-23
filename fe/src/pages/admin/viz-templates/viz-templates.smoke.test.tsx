import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { VizTemplatesHubPage } from "./VizTemplatesHubPage";

vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { username: "admin", roles: ["admin"], permissions: [] },
  }),
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async (url: string) => {
    if (url.startsWith("/api/v1/dashboard-templates")) {
      return {
        items: [
          {
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
          },
        ],
        total: 1,
        limit: 100,
        offset: 0,
      };
    }
    throw new Error(`unexpected ${url}`);
  }),
}));

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VizTemplatesHubPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("VizTemplatesHubPage smoke", () => {
  it("renders template hub with builtin card", async () => {
    renderHub();
    expect(await screen.findByText("空白看板")).toBeInTheDocument();
  });
});
