import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmbeddedChartLegendShell } from "./EmbeddedChartLegend";

describe("EmbeddedChartLegendShell", () => {
  it("renders legend below chart when position is bottom", () => {
    render(
      <EmbeddedChartLegendShell
        position="bottom"
        fontSize={20}
        items={[{ name: "访问", color: "#465fff" }]}
      >
        <div data-testid="chart-body">chart</div>
      </EmbeddedChartLegendShell>,
    );

    const legend = screen.getByLabelText("图例");
    const chart = screen.getByTestId("chart-body");
    expect(chart.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(legend).toHaveStyle({ fontSize: "20px" });
  });
});
