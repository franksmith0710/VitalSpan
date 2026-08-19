import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useChartExecute } from "@/components/charts/useChartExecute";
import { ADVANCED_CHART_ROW_CAP } from "@/components/charts/engine/buildDatasetEncoding";
import { CustomVizWidget } from "./CustomVizWidget";
import { rewriteBundleCss } from "./customVizHost";
import { coerceLayoutWidget } from "./layoutUtils";

vi.mock("@/lib/api", () => ({
  fetchWithTimeout: vi.fn(async () => ({
    ok: true,
    text: async () => "<!DOCTYPE html><html><body><p>custom</p></body></html>",
  })),
  getAuthHeaders: () => ({}),
  apiFetch: vi.fn(async () => ({
    artifactId: "550e8400-e29b-41d4-a716-446655440000",
    manifest: { defaultStyle: {} },
    status: "active",
    contentHash: "abc",
  })),
}));

vi.mock("@/components/charts/useChartExecute", () => ({
  useChartExecute: vi.fn(() => ({
    columns: [],
    rows: [],
    loading: false,
    error: null,
    slowHint: false,
  })),
}));

vi.mock("@/lib/appBasePath", () => ({
  resolveApiBaseUrl: () => "http://localhost:8000",
}));

afterEach(() => {
  vi.mocked(useChartExecute).mockReturnValue({
    columns: [],
    rows: [],
    loading: false,
    error: null,
    slowHint: false,
  });
});

describe("CustomVizWidget", () => {
  it("coerces customViz widget type", () => {
    const w = coerceLayoutWidget({
      id: "w1",
      type: "customViz",
      customVizConfig: { artifactId: "a1", dataBinding: { status: "manual" } },
    });
    expect(w.type).toBe("customViz");
    expect(w.customVizConfig?.artifactId).toBe("a1");
  });

  it("mounts artifact HTML into the host Base", async () => {
    render(
      <CustomVizWidget
        widget={{
          id: "w1",
          type: "customViz",
          title: "AI",
          colSpan: 6,
          rowSpan: 3,
          order: 0,
          customVizConfig: { artifactId: "550e8400-e29b-41d4-a716-446655440000" },
        }}
        mode="view"
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("custom")).toBeInTheDocument();
    });
    expect(screen.queryByTitle("AI")).not.toBeInTheDocument();
    expect(screen.getByTestId("custom-viz-host")).toHaveClass("vs-custom-viz-host");
  });

  it("scopes bundle html/body css to the host", () => {
    expect(rewriteBundleCss("html,body{margin:0}#root{padding:8px}")).toBe(
      ".vs-custom-viz-host, .vs-custom-viz-host{margin:0}.vs-custom-viz-host #root{padding:8px}",
    );
  });

  it("hides edit toolbar when showChartActionButtons is off", async () => {
    render(
      <CustomVizWidget
        widget={{
          id: "w1",
          type: "customViz",
          title: "AI",
          colSpan: 6,
          rowSpan: 3,
          order: 0,
          customVizConfig: { artifactId: "550e8400-e29b-41d4-a716-446655440000" },
        }}
        mode="edit"
        dashboardStyle={{ chrome: { showChartActionButtons: false } }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("custom")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("拖动以移动组件")).not.toBeInTheDocument();
  });

  it("shows data loading hint only when showChartLoadingHint is on", async () => {
    vi.mocked(useChartExecute).mockReturnValue({
      columns: [],
      rows: [],
      loading: true,
      error: null,
      slowHint: false,
    });

    const widget = {
      id: "w1",
      type: "customViz" as const,
      title: "AI",
      colSpan: 6,
      rowSpan: 3,
      order: 0,
      customVizConfig: {
        artifactId: "550e8400-e29b-41d4-a716-446655440000",
        dataBinding: {
          status: "connected",
          dataSourceId: "ds1",
          datasetId: "set1",
          configId: "cfg1",
          dimensions: [{ field: "name" }],
          metrics: [{ field: "value", agg: "sum" as const }],
        },
      },
    };

    const { rerender } = render(
      <CustomVizWidget
        widget={widget}
        mode="view"
        dashboardStyle={{ chrome: { showChartLoadingHint: true } }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("custom-viz-data-loading")).toBeInTheDocument();
    });

    rerender(
      <CustomVizWidget
        widget={widget}
        mode="view"
        dashboardStyle={{ chrome: { showChartLoadingHint: false } }}
      />,
    );
    expect(screen.queryByTestId("custom-viz-data-loading")).not.toBeInTheDocument();
  });

  it("shows truncated banner when rows exceed cap", async () => {
    const cappedRows = Array.from({ length: ADVANCED_CHART_ROW_CAP }, (_, index) => [
      `row-${index}`,
      index,
    ]);
    vi.mocked(useChartExecute).mockReturnValue({
      columns: ["name", "value"],
      rows: [...cappedRows, [`row-${ADVANCED_CHART_ROW_CAP}`, ADVANCED_CHART_ROW_CAP]],
      loading: false,
      error: null,
      slowHint: false,
    });

    render(
      <CustomVizWidget
        widget={{
          id: "w1",
          type: "customViz",
          title: "AI",
          colSpan: 6,
          rowSpan: 3,
          order: 0,
          customVizConfig: {
            artifactId: "550e8400-e29b-41d4-a716-446655440000",
            dataBinding: {
              status: "connected",
              dataSourceId: "ds1",
              datasetId: "set1",
              configId: "cfg1",
              dimensions: [{ field: "name" }],
              metrics: [{ field: "value", agg: "sum" as const }],
            },
          },
        }}
        mode="view"
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("custom-viz-truncated-banner")).toHaveTextContent(
        `数据量较大，已采样显示前 ${ADVANCED_CHART_ROW_CAP} 条`,
      );
    });
  });
});
