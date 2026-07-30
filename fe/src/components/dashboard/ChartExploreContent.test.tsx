import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartExploreContent } from "@/components/dashboard/ChartExploreContent";
import {
  ChartExploreCatalogTrigger,
  ChartExploreDrawer,
} from "@/components/dashboard/ChartExploreDrawer";

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

function renderContent() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChartExploreContent embedded />
    </QueryClientProvider>,
  );
}

function DrawerHarness() {
  const [open, setOpen] = useState(false);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <ChartExploreCatalogTrigger onOpen={() => setOpen(true)} />
      <ChartExploreDrawer open={open} onOpenChange={setOpen} />
    </QueryClientProvider>
  );
}

describe("ChartExploreContent", () => {
  afterEach(() => cleanup());

  it("does not show governance honesty banner", async () => {
    renderContent();
    expect(screen.queryByTestId("gov-honesty-banner")).not.toBeInTheDocument();
  });

  it("renders read-only hint", async () => {
    renderContent();
    expect(screen.getByText(/本目录为只读参考/)).toBeInTheDocument();
  });

  it("loads chart types into detail panel", async () => {
    renderContent();
    expect(await screen.findByRole("heading", { name: "折线图" })).toBeInTheDocument();
    expect(screen.getByText("line")).toBeInTheDocument();
  });
});

describe("ChartExploreDrawer", () => {
  afterEach(() => cleanup());

  it("opens catalog drawer from palette trigger", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    await user.click(screen.getByRole("button", { name: /查看全部类型与字段规则/ }));
    expect(await screen.findByText("图表类型目录")).toBeInTheDocument();
  });
});
