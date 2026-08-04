import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChartInspectorProvider } from "./ChartInspectorProvider";
import { ChartAdvancedMapAreaMappingSection } from "./chartAdvancedSections";
import { defaultChartConfig, type LayoutWidget } from "./layoutUtils";
import { readChartDeStyle } from "@/lib/chartDeStyle";

const mapWidget: LayoutWidget = {
  id: "map-1",
  type: "chart",
  title: "区域地图",
  order: 0,
  colSpan: 6,
  rowSpan: 4,
  chartConfig: defaultChartConfig("map"),
};

describe("ChartAdvancedMapAreaMappingSection", () => {
  it("persists areaMapping via patchChartDeStyleNested", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ChartInspectorProvider widget={mapWidget} onChange={onChange}>
          <ChartAdvancedMapAreaMappingSection />
        </ChartInspectorProvider>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "添加映射" }));
    expect(onChange).toHaveBeenCalled();
    const nextCfg = onChange.mock.calls[0]?.[0];
    const entries = readChartDeStyle(nextCfg).geo?.areaMapping ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBeTruthy();
  });
});
