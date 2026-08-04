import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChartInspectorProvider } from "./ChartInspectorProvider";
import { ChartAdvancedMapAreaMappingSection } from "./ChartGeoAreaMappingPanel";
import { defaultChartConfig, type LayoutWidget } from "./layoutUtils";
import { readChartDeStyle } from "@/lib/chartDeStyle";
import { readChartGeoAreaMapping } from "@/lib/chartGeoAreaMapping";

const useChartExecuteMock = vi.fn();

vi.mock("@/components/charts/useChartExecute", () => ({
  useChartExecute: (...args: unknown[]) => useChartExecuteMock(...args),
}));

const mapWidget: LayoutWidget = {
  id: "map-1",
  type: "chart",
  title: "区域地图",
  order: 0,
  colSpan: 6,
  rowSpan: 4,
  chartConfig: {
    ...defaultChartConfig("map"),
    dataSourceId: "ds-1",
    dimensions: [{ field: "province" }],
    metrics: [{ field: "value" }],
  },
};

const mapWidgetWithMapping: LayoutWidget = {
  ...mapWidget,
  chartConfig: {
    ...mapWidget.chartConfig!,
    nativeBody: {
      deStyle: {
        geo: {
          areaMapping: [{ id: "existing-1", from: "OLD", to: "北京市" }],
        },
      },
    },
  },
};

function renderSection(widget: LayoutWidget, onChange = vi.fn()) {
  useChartExecuteMock.mockReturnValue({
    columns: ["province", "value"],
    rows: [
      ["EAST_01", 1],
      ["江苏省", 2],
    ],
    loading: false,
    error: null,
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ChartInspectorProvider widget={widget} onChange={onChange}>
        <ChartAdvancedMapAreaMappingSection />
      </ChartInspectorProvider>
    </QueryClientProvider>,
  );
  return onChange;
}

afterEach(() => {
  cleanup();
  useChartExecuteMock.mockReset();
});

describe("ChartAdvancedMapAreaMappingSection", () => {
  it("persists areaMapping via patchChartDeStyleNested", async () => {
    const user = userEvent.setup();
    const onChange = renderSection(mapWidget);

    await user.click(screen.getByRole("button", { name: "添加映射" }));
    expect(onChange).toHaveBeenCalled();
    const nextCfg = onChange.mock.calls[0]?.[0];
    const entries = readChartDeStyle(nextCfg).geo?.areaMapping ?? [];
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBeTruthy();
  });

  it("updates from field in chartConfig", async () => {
    const onChange = renderSection(mapWidgetWithMapping);
    const fromInput = screen.getByDisplayValue("OLD");
    fireEvent.change(fromInput, { target: { value: "EAST_01" } });

    const lastCfg = onChange.mock.calls.at(-1)?.[0];
    expect(readChartDeStyle(lastCfg).geo?.areaMapping?.[0]?.from).toBe("EAST_01");
    expect(readChartGeoAreaMapping(readChartDeStyle(lastCfg))).toEqual([
      { id: "existing-1", from: "EAST_01", to: "北京市" },
    ]);
  });

  it("removes mapping row on delete", async () => {
    const user = userEvent.setup();
    const onChange = renderSection(mapWidgetWithMapping);

    await user.click(screen.getByRole("button", { name: "删除映射" }));
    const nextCfg = onChange.mock.calls.at(-1)?.[0];
    expect(readChartDeStyle(nextCfg).geo?.areaMapping ?? []).toHaveLength(0);
  });

  it("imports unmatched values from preview data", async () => {
    const user = userEvent.setup();
    const onChange = renderSection(mapWidget);

    await user.click(screen.getByRole("button", { name: /导入未匹配/ }));
    const nextCfg = onChange.mock.calls.at(-1)?.[0];
    const entries = readChartDeStyle(nextCfg).geo?.areaMapping ?? [];
    expect(entries.some((entry) => entry.from === "EAST_01")).toBe(true);
  });

  it("shows match status from preview data", () => {
    renderSection(mapWidget);
    expect(screen.getByText(/已匹配 1\/2 条/)).toBeInTheDocument();
    expect(screen.getByText(/1 个取值未匹配/)).toBeInTheDocument();
  });

  it("persists map region via province select", async () => {
    const user = userEvent.setup();
    const onChange = renderSection({
      ...mapWidget,
      chartConfig: {
        ...mapWidget.chartConfig!,
        nativeBody: {
          deStyle: {
            geo: {
              areaMapping: [{ id: "row-1", from: "EAST_01", to: "" }],
            },
          },
        },
      },
    });

    await user.click(screen.getByRole("combobox", { name: "地图区域" }));
    const listbox = screen.getByRole("listbox");
    await user.click(within(listbox).getByRole("option", { name: "江苏省" }));

    const lastCfg = onChange.mock.calls.at(-1)?.[0];
    expect(readChartDeStyle(lastCfg).geo?.areaMapping?.[0]?.to).toBe("江苏省");
  });
});
