import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PixelLayoutWidget } from "../layoutUtils";
import { PixelShapeActionRail } from "./PixelShapeActionRail";

const chartWidget: PixelLayoutWidget = {
  id: "w-map",
  type: "chart",
  title: "区域地图",
  x: 400,
  y: 100,
  width: 480,
  height: 320,
  order: 1,
  chartConfig: {
    chartId: "w-map",
    chartType: "map",
    dataSourceId: "ds-1",
    dimensions: [],
    metrics: [],
  },
};

afterEach(() => {
  cleanup();
});

describe("PixelShapeActionRail", () => {
  it("shows hover tips and wires view-data / enlarge actions", async () => {
    const user = userEvent.setup();
    const onViewData = vi.fn();
    const onEnlarge = vi.fn();

    render(
      <PixelShapeActionRail
        widget={chartWidget}
        scale={1}
        viewport={{ x: 0, width: 1440 }}
        actions={{ onViewData, onEnlarge, onCopy: vi.fn(), onDelete: vi.fn() }}
      />,
    );

    expect(screen.getByRole("tooltip", { name: "查看数据" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: "放大" })).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: "更多操作" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "查看数据" }));
    await user.click(screen.getByRole("button", { name: "放大" }));

    expect(onViewData).toHaveBeenCalledWith("w-map");
    expect(onEnlarge).toHaveBeenCalledWith("w-map");
  });

  it("opens more menu with copy action", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();

    render(
      <PixelShapeActionRail
        widget={chartWidget}
        scale={1}
        viewport={{ x: 0, width: 1440 }}
        actions={{ onCopy }}
      />,
    );

    const rail = screen.getByTestId("pixel-shape-actions-w-map");
    const more = within(rail).getByTestId("pixel-shape-action-more");
    expect(more).toHaveAttribute("aria-haspopup", "menu");

    await user.click(more);
    await user.click(await screen.findByRole("menuitem", { name: /复制/ }));

    expect(onCopy).toHaveBeenCalledWith("w-map");
  });
});
