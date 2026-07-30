import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { LayoutWidget, TabsWidgetConfig } from "./layoutUtils";
import { MediaWidgetStylePanel, TabsWidgetStylePanel, TextWidgetStylePanel } from "./widgetRailStyleSections";

afterEach(cleanup);

describe("widgetRailStyleSections", () => {
  it("tabs widget patches headStyle font size", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const widget = {
      id: "w-tabs",
      type: "tabs" as const,
      title: "页签组件",
      order: 1,
      colSpan: 12,
      rowSpan: 4,
      tabsConfig: {
        tabs: [{ id: "t1", label: "Tab1" }],
        activeTabId: "t1",
      } satisfies TabsWidgetConfig,
    } satisfies LayoutWidget & { tabsConfig: TabsWidgetConfig };

    render(
      <TooltipProvider delayDuration={0}>
        <TabsWidgetStylePanel widget={widget} onChange={onChange} />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("combobox", { name: "字体大小" }));
    await user.click(await screen.findByRole("option", { name: "16" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        headStyle: expect.objectContaining({ fontSize: 16 }),
      }),
    );
  });

  it("media widget patches fit mode", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const widget = {
      id: "w-media",
      type: "media" as const,
      title: "图片",
      order: 1,
      colSpan: 6,
      rowSpan: 4,
      mediaConfig: { src: "/demo.png", fit: "contain", align: "center" },
    } satisfies LayoutWidget & { mediaConfig: NonNullable<LayoutWidget["mediaConfig"]> };

    render(
      <TooltipProvider delayDuration={0}>
        <MediaWidgetStylePanel
          widget={widget}
          cfg={widget.mediaConfig}
          onChange={onChange}
        />
      </TooltipProvider>,
    );

    await user.click(screen.getByRole("button", { name: "覆盖" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fit: "cover" }));
  });

  it("text widget panel renders character hint", () => {
    const widget: LayoutWidget = {
      id: "w-text",
      type: "text",
      title: "文本",
      order: 1,
      colSpan: 6,
      rowSpan: 2,
      textConfig: { content: "Hello" },
    };

    render(
      <TextWidgetStylePanel
        widget={widget}
        characters={5}
        widgetStyle={{}}
        onWidgetStyleChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("text-widget-style-panel")).toBeInTheDocument();
    expect(screen.getByText("当前内容：5 个字符")).toBeInTheDocument();
  });
});
