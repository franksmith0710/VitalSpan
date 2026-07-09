import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WidgetInspector } from "@/components/dashboard/WidgetInspector";
import { defaultChartConfig, type LayoutWidget } from "@/components/dashboard/layoutUtils";

const mockApiFetch = vi.fn();

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  };
});

const widget: LayoutWidget = {
  id: "w1",
  type: "chart",
  title: "图表 A",
  colSpan: 6,
  rowSpan: 1,
  order: 0,
  chartConfig: {
    ...defaultChartConfig("line"),
    chartId: "w1",
    mode: "dataset",
    dataSourceId: "ds-1",
  },
};

function renderInspector() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WidgetInspector widget={widget} onChange={onChange} embedded />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onChange;
}

describe("WidgetInspector dataset select", () => {
  afterEach(() => {
    cleanup();
    mockApiFetch.mockReset();
  });

  it("shows empty dataset option when no datasets exist", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/datasources") {
        return { items: [{ id: "ds-1", name: "分析库", code: "a" }] };
      }
      if (path.includes("/api/v1/datasets")) return { items: [], total: 0 };
      return {};
    });

    const user = userEvent.setup();
    renderInspector();

    const trigger = await screen.findByRole("combobox", { name: /dataset/i });
    expect(await screen.findByText(/当前没有可用的 Dataset/)).toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("option", { name: "暂无 Dataset" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("link", { name: "Dataset 管理" })).toHaveAttribute(
      "href",
      "/admin/datasets",
    );
  });

  it("deletes widget from inspector panel", async () => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/api/v1/datasources") {
        return { items: [{ id: "ds-1", name: "分析库", code: "a" }] };
      }
      if (path.includes("/api/v1/datasets")) return { items: [], total: 0 };
      return {};
    });

    const user = userEvent.setup();
    const onDelete = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <WidgetInspector widget={widget} onChange={vi.fn()} onDelete={onDelete} embedded />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "删除组件" }));
    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
