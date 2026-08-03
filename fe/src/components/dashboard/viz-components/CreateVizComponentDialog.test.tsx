import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { CreateVizComponentDialog } from "./CreateVizComponentDialog";

vi.mock("@/lib/vizComponents", () => ({
  createVizComponent: vi.fn(),
  VIZ_COMPONENT_CATEGORIES: [{ key: "general", label: "通用" }],
}));

vi.mock("@/lib/chartRegistry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/chartRegistry")>();
  return {
    ...actual,
    fetchChartTypeCatalog: vi.fn(async () => [
      { type: "bar", displayName: "基础柱状图", library: "d3", paletteCategory: "compare" },
      { type: "line", displayName: "基础折线图", library: "d3", paletteCategory: "trend" },
    ]),
  };
});

vi.stubGlobal(
  "IntersectionObserver",
  vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  })),
);

describe("CreateVizComponentDialog", () => {
  function renderDialog() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <CreateVizComponentDialog open onOpenChange={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("expands chart catalog when chart widget type is selected", async () => {
    renderDialog();

    expect(await screen.findByTestId("chart-picker-popover")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /基础折线图/i })).toBeInTheDocument();
  });
});
