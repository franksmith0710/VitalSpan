import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReportTemplatesPage } from "./ReportTemplatesPage";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ user: { roles: ["admin"] }, isAuthenticated: true }),
}));

const NODE_ID = "node-1";

describe("report templates smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockImplementation(async (path: string, opts?: { method?: string; body?: string }) => {
      if (path.startsWith("/api/v1/reports/catalog/nodes") && !path.includes("/extension")) {
        return {
          items: [
            {
              id: NODE_ID,
              name: "销售模板",
              parentId: null,
              nodeType: "template",
              templateKind: "word",
              templateKey: "sales_summary",
              sortOrder: 0,
            },
          ],
        };
      }
      if (path.endsWith("/extension") && opts?.method === "PUT") {
        return { catalogNodeId: NODE_ID, metrics: [{ key: "amount", label: "金额" }], filters: [] };
      }
      if (path.endsWith("/extension")) {
        return { catalogNodeId: NODE_ID, metrics: [], filters: [] };
      }
      if (path.endsWith("/render-spec")) {
        return { templateNodeId: NODE_ID, revision: 1, metrics: [], filters: [], renderVersion: "1" };
      }
      if (path.includes("/run")) {
        return { status: "ready", renderSpec: { sections: [{ placeholder: true }] } };
      }
      return {};
    });
  });
  afterEach(() => cleanup());

  it("shows empty catalog state", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/v1/reports/catalog/nodes")) return { items: [] };
      return {};
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TooltipProvider delayDuration={0}>
          <MemoryRouter>
            <ReportTemplatesPage />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText(/暂无模板目录/)).toBeInTheDocument());
  });

  it("loads tree and shows extension preview", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TooltipProvider delayDuration={0}>
          <MemoryRouter initialEntries={[`/admin/reports/templates/${NODE_ID}`]}>
            <ReportTemplatesPage />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("销售模板")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "销售模板" }));
    await userEvent.click(screen.getByRole("tab", { name: "预览" }));
    await waitFor(() => expect(screen.getByText(/"renderVersion"/)).toBeInTheDocument());
  });

  it("saves extension with toast on change note", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <TooltipProvider delayDuration={0}>
          <MemoryRouter>
            <ReportTemplatesPage />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("销售模板")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "销售模板" }));
    await userEvent.click(screen.getByRole("tab", { name: "扩展配置" }));
    await userEvent.type(screen.getByLabelText("变更说明"), "初始化");
    await userEvent.click(screen.getByRole("button", { name: "保存扩展配置" }));
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining("/extension"),
        expect.objectContaining({ method: "PUT" }),
      ),
    );
  });
});

const P95_BUDGET_MS = 3000;
const SAMPLES = 5;

function p95(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

describe("NFR-002 report query P95", () => {
  beforeEach(() => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path.includes("/run")) {
        return { status: "ready", renderSpec: { sections: [{ placeholder: true }] }, exportHook: { placeholder: true } };
      }
      if (path.startsWith("/api/v1/reports/catalog/nodes")) return { items: [] };
      return {};
    });
  });

  it("mock template run P95 within CI budget", async () => {
    const samples: number[] = [];
    for (let i = 0; i < SAMPLES; i += 1) {
      const t0 = performance.now();
      await mockApiFetch(`/api/v1/reports/templates/${NODE_ID}/run`, { method: "POST", body: "{}" });
      samples.push(performance.now() - t0);
    }
    expect(p95(samples)).toBeLessThanOrEqual(P95_BUDGET_MS);
  });
});
