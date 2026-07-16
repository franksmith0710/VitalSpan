import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TabsPaneList } from "./TabsWidgetFields";
import { defaultMediaConfig, defaultTabsConfig, type LayoutWidget } from "./layoutUtils";

const tabsId = "tabs-1";
const paneId = "pane-a";
const childId = "media-1";

const tabsWidget = {
  id: tabsId,
  title: "页签",
  type: "tabs" as const,
  col: 0,
  row: 0,
  colSpan: 12,
  rowSpan: 6,
  order: 0,
  tabsConfig: {
    ...defaultTabsConfig(tabsId),
    activePaneId: paneId,
    panes: [{ id: paneId, title: "页签 1", childWidgetIds: [childId] }],
  },
};

const mediaChild = {
  id: childId,
  title: "宣传图",
  type: "media" as const,
  col: 0,
  row: 0,
  colSpan: 4,
  rowSpan: 3,
  order: 1,
  parentTabsId: tabsId,
  tabPaneId: paneId,
  mediaConfig: defaultMediaConfig(),
};

describe("TabsPaneList", () => {
  afterEach(() => cleanup());

  it("selects child widget when clicking nested row", async () => {
    const user = userEvent.setup();
    const onSelectChild = vi.fn();
    render(
      <TabsPaneList
        widget={tabsWidget as LayoutWidget & { tabsConfig: typeof tabsWidget.tabsConfig }}
        allWidgets={[tabsWidget, mediaChild] as LayoutWidget[]}
        onChange={() => {}}
        onSelectChild={onSelectChild}
      />,
    );

    await user.click(screen.getByRole("button", { name: "配置 宣传图" }));
    expect(onSelectChild).toHaveBeenCalledWith(childId);
  });

  it("selects first child when clicking item count badge", async () => {
    const user = userEvent.setup();
    const onSelectChild = vi.fn();
    render(
      <TabsPaneList
        widget={tabsWidget as LayoutWidget & { tabsConfig: typeof tabsWidget.tabsConfig }}
        allWidgets={[tabsWidget, mediaChild] as LayoutWidget[]}
        onChange={() => {}}
        onSelectChild={onSelectChild}
      />,
    );

    await user.click(screen.getByRole("button", { name: "查看页签 页签 1 内的 1 个组件" }));
    expect(onSelectChild).toHaveBeenCalledWith(childId);
  });
});
