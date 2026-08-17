import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useRef } from "react";
import { EmbeddedChartLegendShell, legendShellMaxHeightPx } from "./EmbeddedChartLegend";

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

  it("caps horizontal legend height for adaptive layout", () => {
    render(
      <EmbeddedChartLegendShell
        position="bottom"
        fontSize={12}
        items={[
          { name: "A", color: "#111" },
          { name: "B", color: "#222" },
          { name: "C", color: "#333" },
          { name: "D", color: "#444" },
        ]}
      >
        <div data-testid="chart-body">chart</div>
      </EmbeddedChartLegendShell>,
    );
    const legend = screen.getByLabelText("图例");
    expect(legend).toHaveStyle({ maxHeight: `${legendShellMaxHeightPx(12)}px` });
  });

  it("renders vertical legend layout when orient is vertical", () => {
    render(
      <EmbeddedChartLegendShell
        position="right"
        orient="vertical"
        fontSize={12}
        icon="triangle"
        iconSize={6}
        items={[{ name: "访问", color: "#465fff" }]}
      >
        <div data-testid="chart-body">chart</div>
      </EmbeddedChartLegendShell>,
    );

    const legend = screen.getByLabelText("图例");
    expect(legend).toHaveClass("flex-col");
  });

  it("keeps chart area flex-1 when legend is on the side", () => {
    const { container } = render(
      <div className="w-[240px]">
        <EmbeddedChartLegendShell
          position="left"
          orient="horizontal"
          items={[{ name: "amount", color: "#465fff" }]}
        >
          <div data-testid="chart-body">chart</div>
        </EmbeddedChartLegendShell>
      </div>,
    );

    const chart = screen.getByTestId("chart-body");
    expect(chart.parentElement).toHaveClass("flex-1");
    expect(container.querySelector('[data-legend-slot="side"]')).toBeTruthy();
    expect(screen.getByLabelText("图例")).toHaveClass("flex-col");
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

  it("paginates horizontal legend when items exceed page size", () => {
    const manyItems = Array.from({ length: 10 }, (_, index) => ({
      name: `系列${index + 1}`,
      color: "#111",
    }));

    render(
      <EmbeddedChartLegendShell position="bottom" fontSize={12} items={manyItems}>
        <div data-testid="chart-body">chart</div>
      </EmbeddedChartLegendShell>,
    );

    const legend = screen.getByLabelText("图例");
    expect(within(legend).getByText("系列1")).toBeInTheDocument();
    expect(within(legend).queryByText("系列9")).not.toBeInTheDocument();
    expect(screen.getByLabelText("下一页图例")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });
});
