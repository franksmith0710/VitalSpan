import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CanvasScaleArea } from "./CanvasScaleArea";

afterEach(() => cleanup());

describe("CanvasScaleArea", () => {
  it("renders shortcut hints and current zoom", () => {
    render(
      <CanvasScaleArea
        userZoom={0.6}
        onZoomChange={vi.fn()}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onResetViewport={vi.fn()}
      />,
    );

    expect(screen.getByText("空格拖动画布")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+滚轮缩放")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "画布缩放比例" })).toHaveTextContent("60%");
  });

  it("calls zoom handlers from controls", () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const onResetViewport = vi.fn();

    render(
      <CanvasScaleArea
        userZoom={1}
        onZoomChange={vi.fn()}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetViewport={onResetViewport}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "放大画布" }));
    fireEvent.click(screen.getByRole("button", { name: "缩小画布" }));
    fireEvent.click(screen.getByRole("button", { name: "重置视口" }));

    expect(onZoomIn).toHaveBeenCalledTimes(1);
    expect(onZoomOut).toHaveBeenCalledTimes(1);
    expect(onResetViewport).toHaveBeenCalledTimes(1);
  });
});
