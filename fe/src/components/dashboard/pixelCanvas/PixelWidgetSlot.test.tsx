import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PixelLayoutWidget } from "../layoutUtils";
import { PixelWidgetSlot } from "./PixelWidgetSlot";

const base: PixelLayoutWidget = {
  id: "w1",
  type: "chart",
  title: "销量",
  order: 1,
  x: 10,
  y: 20,
  width: 300,
  height: 200,
};

describe("PixelWidgetSlot", () => {
  it("skips child re-render when only x/y changes", () => {
    const renderWidget = vi.fn((widget: PixelLayoutWidget) => (
      <span data-testid="slot-body">{widget.title}</span>
    ));
    const { rerender } = render(
      <PixelWidgetSlot widget={base} renderWidget={renderWidget} contentRevision="r1" />,
    );
    expect(renderWidget).toHaveBeenCalledTimes(1);

    rerender(
      <PixelWidgetSlot
        widget={{ ...base, x: 40, y: 80 }}
        renderWidget={renderWidget}
        contentRevision="r1"
      />,
    );
    expect(renderWidget).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("slot-body")).toHaveTextContent("销量");
  });

  it("re-renders when contentRevision changes", () => {
    const renderWidget = vi.fn((widget: PixelLayoutWidget) => (
      <span>{widget.width}</span>
    ));
    const { rerender } = render(
      <PixelWidgetSlot widget={base} renderWidget={renderWidget} contentRevision="r1" />,
    );
    rerender(
      <PixelWidgetSlot widget={base} renderWidget={renderWidget} contentRevision="r2" />,
    );
    expect(renderWidget).toHaveBeenCalledTimes(2);
  });

  it("re-renders when width or height changes", () => {
    const renderWidget = vi.fn((widget: PixelLayoutWidget) => (
      <span>{widget.width}</span>
    ));
    const { rerender } = render(
      <PixelWidgetSlot widget={base} renderWidget={renderWidget} contentRevision="r1" />,
    );
    rerender(
      <PixelWidgetSlot
        widget={{ ...base, width: 360 }}
        renderWidget={renderWidget}
        contentRevision="r1"
      />,
    );
    expect(renderWidget).toHaveBeenCalledTimes(2);
  });
});
