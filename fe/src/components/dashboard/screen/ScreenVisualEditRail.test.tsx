import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScreenVisualEditRail } from "./ScreenVisualEditRail";
import {
  createScreenBorderWidget,
  createScreenIconWidget,
  createScreenShapeWidget,
  createScreenTitleBarWidget,
  SCREEN_CLOCK_MARKER,
} from "@/lib/screenVisualAssets";
import type { LayoutWidget } from "@/components/dashboard/layoutUtils";

function asTextWidget(widget: LayoutWidget) {
  return widget as LayoutWidget & { textConfig: NonNullable<LayoutWidget["textConfig"]> };
}

describe("ScreenVisualEditRail", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders style panel directly without data tab", () => {
    const borderWidget = asTextWidget(createScreenBorderWidget([], undefined, "border-1"));
    render(<ScreenVisualEditRail widget={borderWidget} />);

    expect(screen.queryByRole("tab", { name: "数据" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "样式" })).not.toBeInTheDocument();
    expect(screen.getByTestId("border-variant-select")).toBeInTheDocument();
  });

  it("updates clock style from style panel", async () => {
    const user = userEvent.setup();
    const onTextConfigChange = vi.fn();
    const clockWidget = asTextWidget({
      id: "clock-1",
      type: "text",
      title: "时钟",
      colSpan: 6,
      rowSpan: 1,
      order: 0,
      textConfig: { content: SCREEN_CLOCK_MARKER, variant: "plain" },
    });

    render(
      <ScreenVisualEditRail widget={clockWidget} onTextConfigChange={onTextConfigChange} />,
    );

    await user.click(screen.getByRole("combobox", { name: "字体大小" }));
    await user.click(screen.getByRole("option", { name: "24" }));

    const lastCall = onTextConfigChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.screenStyle?.clock?.fontSize).toBe(24);
  });

  it("updates border variant from style panel", async () => {
    const user = userEvent.setup();
    const onTextConfigChange = vi.fn();
    const borderWidget = asTextWidget(createScreenBorderWidget([], undefined, "border-1"));

    render(
      <ScreenVisualEditRail widget={borderWidget} onTextConfigChange={onTextConfigChange} />,
    );

    await user.click(screen.getByTestId("border-variant-select"));
    await user.click(screen.getByTestId("border-variant-border-3"));

    const lastCall = onTextConfigChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.screenStyle?.border?.variant).toBe("border-3");
  });

  it("updates shape type from style panel", async () => {
    const user = userEvent.setup();
    const onTextConfigChange = vi.fn();
    const shapeWidget = asTextWidget(createScreenShapeWidget([], undefined, "rect"));

    render(
      <ScreenVisualEditRail widget={shapeWidget} onTextConfigChange={onTextConfigChange} />,
    );

    await user.click(screen.getByRole("button", { name: "三角形" }));

    const lastCall = onTextConfigChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.screenStyle?.shape?.shape).toBe("triangle");
  });

  it("updates icon preset from style panel", async () => {
    const user = userEvent.setup();
    const onTextConfigChange = vi.fn();
    const iconWidget = asTextWidget(createScreenIconWidget([], undefined, "star"));

    render(
      <ScreenVisualEditRail widget={iconWidget} onTextConfigChange={onTextConfigChange} />,
    );

    await user.click(screen.getByTestId("icon-preset-home"));

    const lastCall = onTextConfigChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.screenStyle?.icon?.icon).toBe("home");
  });

  it("enables border sparkles from style panel", async () => {
    const user = userEvent.setup();
    const onTextConfigChange = vi.fn();
    const borderWidget = asTextWidget(createScreenBorderWidget([], undefined, "border-1"));

    render(
      <ScreenVisualEditRail widget={borderWidget} onTextConfigChange={onTextConfigChange} />,
    );

    await user.click(screen.getByRole("switch", { name: "边框流光" }));

    const lastCall = onTextConfigChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.screenStyle?.border?.sparkle?.enabled).toBe(true);
    expect(lastCall?.screenStyle?.border?.sparkle?.sparkles?.length).toBeGreaterThanOrEqual(1);
  });

  it("updates title bar side lines from style panel", async () => {
    const user = userEvent.setup();
    const onTextConfigChange = vi.fn();
    const titleWidget = asTextWidget(createScreenTitleBarWidget([]));

    render(
      <ScreenVisualEditRail widget={titleWidget} onTextConfigChange={onTextConfigChange} />,
    );

    await user.click(screen.getByRole("switch", { name: "显示两侧装饰线" }));

    const lastCall = onTextConfigChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.screenStyle?.titleBar?.showSideLines).toBe(false);
  });
});
