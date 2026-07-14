import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import { WidgetEditRailLayout } from "./WidgetEditRailLayout";
import { DatasetPickerPanel } from "./DatasetPickerPanel";

function renderRail(ui: ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("WidgetEditRailLayout", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders DE-style fold tab on config column; dataset column is self-contained", () => {
    renderRail(
      <WidgetEditRailLayout
        leftLabel="基础折线图"
        rightLabel="数据集"
        left={<div>配置</div>}
        right={<div data-testid="dataset-main">字段库</div>}
      />,
    );

    expect(screen.getByText("配置")).toBeInTheDocument();
    expect(screen.getByTestId("dataset-main")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("收起基础折线图"));

    expect(screen.getByLabelText("展开基础折线图")).toBeVisible();
    expect(screen.queryByText("配置")).not.toBeInTheDocument();
    expect(screen.getByTestId("dataset-main")).toBeInTheDocument();
  });

  it("dataset column fold button collapses to the right expand tab", () => {
    renderRail(
      <WidgetEditRailLayout
        leftLabel="基础折线图"
        rightLabel="数据集"
        left={<div>配置</div>}
        right={
          <DatasetPickerPanel
            widgetId="w1"
            datasetsLoading={false}
            datasetsError={false}
            datasetsEmpty
            datasetItems={[]}
            columns={[]}
            columnsLoading={false}
            columnsReady={false}
            onDatasetSelect={() => {}}
          />
        }
      />,
    );

    fireEvent.click(screen.getByLabelText("收起数据集"));

    expect(screen.getByLabelText("展开数据集")).toBeVisible();
    expect(screen.queryByText("维度")).not.toBeInTheDocument();
    expect(screen.getByText("配置")).toBeInTheDocument();
  });
});
