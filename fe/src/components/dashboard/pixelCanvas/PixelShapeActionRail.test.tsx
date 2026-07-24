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

    await user.hover(screen.getByRole("button", { name: "查看数据" }));
    expect(await screen.findByRole("tooltip", { name: "查看数据" })).toBeInTheDocument();

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

  it("tags more menu with dashboard dark theme for portaled chrome", async () => {
    const user = userEvent.setup();

    render(
      <PixelShapeActionRail
        widget={chartWidget}
        scale={1}
        viewport={{ x: 0, width: 1440 }}
        colorScheme="dark"
        actions={{ onCopy: vi.fn() }}
      />,
    );

    await user.click(screen.getByTestId("pixel-shape-action-more"));
    const menu = await screen.findByRole("menu");

    expect(menu).toHaveAttribute("data-dashboard-menu", "");
    expect(menu).toHaveAttribute("data-dashboard-color-scheme", "dark");
    expect(menu.className).toMatch(/bg-gray-900/);
  });

  it("keeps compact height while parent shape is in isPlayer resize", () => {
    const { container } = render(
      <div className="pixel-canvas-host">
        <div
          className="pixel-shape-outer"
          data-pixel-is-player=""
          style={{ position: "relative", width: 480, height: 320 }}
        >
          <PixelShapeActionRail
            widget={chartWidget}
            scale={1}
            viewport={{ x: 0, width: 1440 }}
            actions={{ onCopy: vi.fn() }}
          />
        </div>
      </div>,
    );

    const rail = screen.getByTestId("pixel-shape-actions-w-map");
    const styles = getComputedStyle(rail);
    expect(styles.height).not.toBe("100%");
    expect(styles.width).not.toBe("100%");
    expect(screen.getAllByRole("button")).toHaveLength(3);
    screen.getAllByRole("button").forEach((button) => {
      expect(button.style.height).toBe("36px");
      expect(button.style.width).toBe("36px");
    });
  });

  it("overlays action rail inside the widget when both sides overflow viewport", () => {
    render(
      <PixelShapeActionRail
        widget={{ ...chartWidget, x: 0, width: 300 }}
        scale={1}
        viewport={{ x: 0, width: 320 }}
        actions={{ onCopy: vi.fn() }}
      />,
    );

    const rail = screen.getByTestId("pixel-shape-actions-w-map");
    expect(rail).toHaveAttribute("data-placement", "overlay");
    expect(rail.style.right).toBe("0px");
    expect(rail.style.top).toBe("0px");
  });
});
