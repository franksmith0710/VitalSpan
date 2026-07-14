import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WidgetEditRailLayout } from "./WidgetEditRailLayout";

describe("WidgetEditRailLayout", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders DE-style fold tabs with vertical labels when collapsed", () => {
    render(
      <WidgetEditRailLayout
        leftLabel="基础折线图"
        rightLabel="数据集"
        left={<div>配置</div>}
        right={<div>字段</div>}
      />,
    );

    fireEvent.click(screen.getByLabelText("收起基础折线图"));
    fireEvent.click(screen.getByLabelText("收起数据集"));

    expect(screen.getByLabelText("展开基础折线图")).toBeVisible();
    expect(screen.getByLabelText("展开数据集")).toBeVisible();
    expect(screen.getByText("基础折线图")).toBeVisible();
    expect(screen.getByText("数据集")).toBeVisible();
    expect(screen.queryByText("配置")).not.toBeInTheDocument();
    expect(screen.queryByText("字段")).not.toBeInTheDocument();
  });
});
