import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useRef } from "react";
import { EmbeddedChartLegendShell } from "./EmbeddedChartLegend";

function createChartBodyProbe() {
  let instanceId = "";
  function ChartBody() {
    const idRef = useRef(`chart-${Math.random().toString(36).slice(2)}`);
    instanceId = idRef.current;
    return <div data-testid="chart-body">chart</div>;
  }
  return { ChartBody, getInstanceId: () => instanceId };
}

describe("EmbeddedChartLegendShell", () => {
  afterEach(() => {
    cleanup();
  });

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

  it("does not remount chart children when legend items appear", () => {
    const { ChartBody, getInstanceId } = createChartBodyProbe();

    const { rerender } = render(
      <EmbeddedChartLegendShell position="bottom" items={[]}>
        <ChartBody />
      </EmbeddedChartLegendShell>,
    );
    const before = getInstanceId();

    rerender(
      <EmbeddedChartLegendShell
        position="bottom"
        items={[{ name: "访问", color: "#465fff" }]}
      >
        <ChartBody />
      </EmbeddedChartLegendShell>,
    );
    expect(getInstanceId()).toBe(before);
  });
});
