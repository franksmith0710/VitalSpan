import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ComponentPayloadPreview } from "./ComponentPayloadPreview";

vi.mock("@/components/dashboard/viz-components/VizComponentLivePreview", () => ({
  VizComponentLivePreview: () => <div data-testid="viz-component-live-preview" />,
}));

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
});
