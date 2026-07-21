import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartExplorePage } from "./ChartExplorePage";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(async () => [
    {
      type: "line",
      displayName: "折线图",
      category: "basic",
      renderer: "antv",
      styleVariants: ["default", "area"],
      capabilities: ["style_variant", "field_config"],
      fieldRule: { minDimensions: 1, maxDimensions: 2, minMetrics: 1, maxMetrics: 4 },
    },
    {
      type: "bar",
      displayName: "柱状图",
      category: "basic",
      renderer: "antv",
      styleVariants: ["default"],
      capabilities: ["style_variant"],
      fieldRule: { minDimensions: 1, maxDimensions: 2, minMetrics: 1, maxMetrics: 4 },
    },
  ]),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ChartExplorePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ChartExplorePage", () => {
  afterEach(() => cleanup());

  it("does not show governance honesty banner", async () => {
    renderPage();
    expect(screen.queryByTestId("gov-honesty-banner")).not.toBeInTheDocument();
  });

  it("renders catalog title and read-only hint", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "图表类型目录" })).toBeInTheDocument();
    expect(screen.getByText(/本页为只读参考目录/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /去仪表板建图/ })).toBeInTheDocument();
  });

  it("loads chart types into detail panel", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { name: "折线图" })).toBeInTheDocument();
    expect(screen.getByText("line")).toBeInTheDocument();
  });
});
