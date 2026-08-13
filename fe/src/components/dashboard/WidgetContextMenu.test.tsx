import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DashboardWidgetContextMenu,
  WidgetContextMenuContent,
} from "./WidgetContextMenu";

const chartWidget = {
  id: "w-chart",
  type: "chart" as const,
  locked: false,
};

const textWidget = {
  id: "w-text",
  type: "text" as const,
  locked: false,
};

describe("DashboardWidgetContextMenu", () => {
  afterEach(() => {
    cleanup();
  });

  it("mounts context menu root around widget body", () => {
    render(
      <DashboardWidgetContextMenu
        widget={chartWidget}
        actions={{ onCopy: vi.fn(), onDelete: vi.fn() }}
        selected
      >
        <div data-testid="widget-body">chart</div>
      </DashboardWidgetContextMenu>,
    );

    expect(screen.getByTestId("widget-body")).toHaveAttribute("data-state", "closed");
  });

  it("runs chart actions from open menu", async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const onEnlarge = vi.fn();
    const onViewData = vi.fn();
    const onDelete = vi.fn();

    render(
      <DashboardWidgetContextMenu
        widget={chartWidget}
        actions={{ onCopy, onEnlarge, onViewData, onDelete }}
        selected
        defaultOpen
      >
        <div data-testid="widget-body">chart</div>
      </DashboardWidgetContextMenu>,
    );

    const menu = screen.getByTestId("widget-context-menu-w-chart");
    await user.click(within(menu).getByText("复制"));
    await user.click(within(menu).getByText("放大"));
    await user.click(within(menu).getByText("查看数据"));
    await user.click(within(menu).getByText("删除"));

    expect(onCopy).toHaveBeenCalledWith("w-chart");
    expect(onEnlarge).toHaveBeenCalledWith("w-chart");
    expect(onViewData).toHaveBeenCalledWith("w-chart");
    expect(onDelete).toHaveBeenCalledWith("w-chart");
  });

  it("selects widget before opening when not selected", () => {
    const onSelect = vi.fn();

    render(
      <DashboardWidgetContextMenu
        widget={textWidget}
        actions={{ onCopy: vi.fn(), onDelete: vi.fn() }}
        selected={false}
        onSelect={onSelect}
      >
        <div data-testid="widget-body">text</div>
      </DashboardWidgetContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId("widget-body"));

    expect(onSelect).toHaveBeenCalledWith("w-text", false);
  });
});

describe("WidgetContextMenuContent", () => {
  afterEach(() => {
    cleanup();
  });

  it("disables chart-only actions for non-chart widgets", () => {
    render(
      <ContextMenu open>
        <ContextMenuTrigger asChild>
          <span>trigger</span>
        </ContextMenuTrigger>
        <ContextMenuContent data-testid="menu-content">
          <WidgetContextMenuContent
            widget={textWidget}
            actions={{ onEnlarge: vi.fn(), onViewData: vi.fn(), onCopy: vi.fn() }}
          />
        </ContextMenuContent>
      </ContextMenu>,
    );

    const menu = screen.getByTestId("menu-content");
    expect(within(menu).getByText("放大")).toHaveAttribute("data-disabled");
    expect(within(menu).getByText("查看数据")).toHaveAttribute("data-disabled");
    expect(within(menu).getByText("复制")).not.toHaveAttribute("data-disabled");
  });
});
