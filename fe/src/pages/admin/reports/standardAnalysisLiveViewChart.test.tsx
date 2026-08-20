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
