import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComponentPayloadPreview } from "./ComponentPayloadPreview";

vi.mock("./VizComponentLivePreview", () => ({
  VizComponentLivePreview: () => <div data-testid="viz-component-live-preview" />,
}));

afterEach(() => {
  cleanup();
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
});
