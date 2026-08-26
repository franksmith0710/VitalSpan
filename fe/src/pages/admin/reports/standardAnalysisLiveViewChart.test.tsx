import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChartViewModel } from "@/components/charts/engine/types";
import { StandardAnalysisLiveView } from "./components/StandardAnalysisLiveView";
import type { AnalysisPack, RunResult } from "./useStandardAnalysis";

const captured: { viewModel?: ChartViewModel } = {};

vi.mock("@/components/charts/engine/ChartEngineView", () => ({
  ChartEngineView: ({ viewModel }: { viewModel: ChartViewModel }) => {
    captured.viewModel = viewModel;
    return <div data-testid="standard-analysis-chart-capture" />;
  },
}));

const pack: AnalysisPack = {
  packKey: "demo-pack",
  displayName: "演示包",
  datasetId: "demo-dataset",
  boundConfigId: "",
  dataSourceId: "00000000-0000-4000-8000-000000000001",
  fieldMapping: { status: "category_name", region: "province", createdAt: "created_at" },
  enabledThemes: ["lifecycle", "distribution"],
  allowedRoles: ["admin"],
  snapshotCronPreset: "daily",
  snapshotRetentionPeriods: 12,
};

const runData: RunResult = {
  packKey: pack.packKey,
  theme: "lifecycle",
  dataSourceId: pack.dataSourceId,
  status: "ready",
  renderSpec: {
    sections: [
      {
        kind: "chart",
        chartType: "bar",
        columns: ["dim", "cnt"],
        rows: [
          ["办公耗材", 120],
          ["电子产品", 80],
        ],
      },
    ],
    meta: {},
  },
};

describe("StandardAnalysisLiveView chart data", () => {
  afterEach(() => {
    cleanup();
    captured.viewModel = undefined;
  });

  it("passes numeric metric cells to chart while table uses string cells", () => {
    render(
      <StandardAnalysisLiveView pack={pack} activeTheme="lifecycle" runData={runData} isLoading={false} />,
    );

    expect(screen.getByTestId("standard-analysis-chart-capture")).toBeInTheDocument();
    expect(captured.viewModel?.dataset.rows).toEqual([
      ["办公耗材", 120],
      ["电子产品", 80],
    ]);
    expect(captured.viewModel?.dataset.columns).toEqual(["dim", "cnt"]);
    expect(typeof captured.viewModel?.dataset.rows[0]?.[1]).toBe("number");
  });
});

describe("StandardAnalysisLiveView live summary strip", () => {
  afterEach(() => {
    cleanup();
    captured.viewModel = undefined;
  });

  it("renders borderless ScheduleStatCard metrics in a full-width grid", () => {
    render(
      <StandardAnalysisLiveView pack={pack} activeTheme="lifecycle" runData={runData} isLoading={false} />,
    );

    const strip = screen.getByTestId("standard-analysis-live-summary");
    expect(strip).toHaveStyle({ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" });
    expect(strip.textContent).toContain("结果行数");
    expect(strip.textContent).toContain("数量合计");
    expect(strip.textContent).toMatch(/结果行数[\s\S]*2/);
    expect(strip.textContent).toMatch(/数量合计[\s\S]*200/);

    const cards = strip.querySelectorAll(".rounded-xl");
    expect(cards.length).toBe(2);
    for (const card of cards) {
      expect(card.className).toMatch(/border-0/);
      expect(card.className).not.toMatch(/border-gray-200/);
    }
  });

  it("adds top-region metric for distribution theme", () => {
    const distributionRun: RunResult = {
      ...runData,
      theme: "distribution",
      renderSpec: {
        sections: [
          {
            kind: "chart",
            chartType: "bar",
            columns: ["region", "cnt"],
            rows: [
              ["华东", 10],
              ["华北", 30],
            ],
          },
        ],
        meta: {},
      },
    };

    render(
      <StandardAnalysisLiveView
        pack={pack}
        activeTheme="distribution"
        runData={distributionRun}
        isLoading={false}
      />,
    );

    const strip = screen.getByTestId("standard-analysis-live-summary");
    expect(strip).toHaveStyle({ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" });
    expect(strip.textContent).toContain("最高区域");
    expect(strip.textContent).toContain("华北");
  });

  it("hides summary strip when there are no rows", () => {
    const emptyRun: RunResult = {
      ...runData,
      renderSpec: {
        sections: [{ kind: "chart", chartType: "bar", columns: ["dim", "cnt"], rows: [] }],
        meta: {},
      },
    };

    render(
      <StandardAnalysisLiveView pack={pack} activeTheme="lifecycle" runData={emptyRun} isLoading={false} />,
    );

    expect(screen.queryByTestId("standard-analysis-live-summary")).not.toBeInTheDocument();
  });
});
