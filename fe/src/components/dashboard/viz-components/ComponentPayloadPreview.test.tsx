import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComponentPayloadPreview } from "./ComponentPayloadPreview";

describe("ComponentPayloadPreview", () => {
  it("renders lightweight mock preview for hub cards", () => {
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
    expect(screen.getByTestId("chart-preview-mock")).toBeInTheDocument();
    expect(screen.queryByTestId("viz-component-live-preview")).not.toBeInTheDocument();
  });
});
