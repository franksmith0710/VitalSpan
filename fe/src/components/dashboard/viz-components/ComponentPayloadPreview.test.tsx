import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { vizComponentPreviewDashboardStyle } from "@/lib/vizComponentPreviewStyle";
import { ComponentPayloadPreview } from "./ComponentPayloadPreview";

const livePreviewCalls: Array<{ dashboardStyle?: ReturnType<typeof vizComponentPreviewDashboardStyle> }> =
  [];

vi.mock("./VizComponentLivePreview", () => ({
  VizComponentLivePreview: (props: { dashboardStyle?: ReturnType<typeof vizComponentPreviewDashboardStyle> }) => {
    livePreviewCalls.push(props);
    return <div data-testid="viz-component-live-preview" />;
  },
}));

afterEach(() => {
  cleanup();
  livePreviewCalls.length = 0;
});

describe("ComponentPayloadPreview", () => {
  it("renders live preview when payload is available", () => {
    render(
      <ComponentPayloadPreview
        componentId="c1"
        componentName="销售 KPI"
        widgetType="chart"
        payload={{
          chartConfig: {
            chartId: "c1",
            chartType: "table-info",
            dimensions: [],
            metrics: [],
          },
        }}
      />,
    );
    expect(screen.getByTestId("viz-component-live-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("chart-preview-mock")).not.toBeInTheDocument();
  });

  it("falls back to mock when payload is missing", () => {
    render(
      <ComponentPayloadPreview
        componentId="c2"
        componentName="空图表"
        widgetType="chart"
      />,
    );
    expect(screen.getByTestId("chart-preview-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("viz-component-live-preview")).not.toBeInTheDocument();
  });

  it("renders live preview for customViz payload", () => {
    render(
      <ComponentPayloadPreview
        componentId="c3"
        componentName="AI 排名条"
        widgetType="customViz"
        payload={{
          customVizConfig: {
            artifactId: "artifact-ranking-bar",
            dataBinding: { status: "manual" },
          },
        }}
      />,
    );
    expect(screen.getByTestId("viz-component-live-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("custom-viz-preview-mock")).not.toBeInTheDocument();
  });

  it("passes shared dashboard preview style to live preview", () => {
    const expected = vizComponentPreviewDashboardStyle();
    render(
      <ComponentPayloadPreview
        componentId="c4"
        componentName="AI 排名条"
        widgetType="customViz"
        payload={{
          customVizConfig: {
            artifactId: "artifact-ranking-bar",
            dataBinding: { status: "manual" },
          },
        }}
      />,
    );

    expect(livePreviewCalls).toHaveLength(1);
    expect(livePreviewCalls[0]?.dashboardStyle).toEqual(expected);
    expect(livePreviewCalls[0]?.dashboardStyle?.colorScheme).toBe("light");
  });
});
