import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardQuickCreateDialog } from "@/components/dashboard/DashboardQuickCreateDialog";

const mockNavigate = vi.fn();
const mockApiFetch = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  };
});

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardQuickCreateDialog open onOpenChange={onOpenChange} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

describe("DashboardQuickCreateDialog", () => {
  afterEach(() => {
    cleanup();
    mockApiFetch.mockReset();
    mockNavigate.mockReset();
  });

  it("creates dashboard with probed dimensions in layout", async () => {
    mockApiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/v1/datasources") {
        return { items: [{ id: "ds-1", name: "分析库", code: "a" }] };
      }
      if (path.includes("/api/v1/datasets")) {
        return {
          items: [
            {
              datasetId: "orders_ds",
              displayName: "订单",
              boundConfigId: "cfg-11111111-1111-4111-8111-111111111111",
            },
          ],
        };
      }
      if (path === "/api/v1/query/dataset/execute" && init?.method === "POST") {
        return { columns: ["region", "amount"], rows: [] };
      }
      if (path === "/api/v1/dashboards" && init?.method === "POST") {
        return { id: "dash-new" };
      }
      if (path === "/api/v1/dashboards/dash-new/layout" && init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as {
          layoutJson?: { widgets?: { chartConfig?: { dimensions?: { field: string }[]; metrics?: { field: string }[] } }[] };
        };
        const cfg = body.layoutJson?.widgets?.[0]?.chartConfig;
        expect(cfg?.dimensions).toEqual([{ field: "region" }]);
        expect(cfg?.metrics).toEqual([{ field: "amount" }]);
        return {};
      }
      return {};
    });

    const user = userEvent.setup();
    renderDialog();

    await user.click(await screen.findByRole("combobox", { name: /数据源/i }));
    await user.click(screen.getByRole("option", { name: "分析库" }));

    await user.click(screen.getByRole("combobox", { name: /dataset/i }));
    await user.click(screen.getByRole("option", { name: "订单" }));

    await user.click(screen.getByRole("button", { name: "创建并编辑" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboards/dash-new/edit");
    });
  });
});
