import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataScreenEditViewport } from "./DataScreenEditViewport";

afterEach(() => cleanup());

describe("DataScreenEditViewport blank selection", () => {
  it("calls onBlankPointerDown when clicking viewport letterbox", () => {
    const onBlankPointerDown = vi.fn();
    render(
      <DataScreenEditViewport
        canvasWidth={1920}
        canvasHeight={1080}
        onBlankPointerDown={onBlankPointerDown}
      >
        <div data-testid="canvas-stage" className="h-[1080px] w-[1920px]" />
      </DataScreenEditViewport>,
    );

    fireEvent.pointerDown(
      screen.getByTestId("data-screen-edit-viewport").querySelector("[data-canvas-scale-viewport]")!,
    );
    expect(onBlankPointerDown).toHaveBeenCalledTimes(1);
  });

  it("does not call onBlankPointerDown when clicking a pixel widget", () => {
    const onBlankPointerDown = vi.fn();
    render(
      <DataScreenEditViewport
        canvasWidth={1920}
        canvasHeight={1080}
        onBlankPointerDown={onBlankPointerDown}
      >
        <div className="pixel-shape-outer" data-testid="widget">
          <button type="button">主标题</button>
        </div>
      </DataScreenEditViewport>,
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "主标题" }));
    expect(onBlankPointerDown).not.toHaveBeenCalled();
  });

  it("calls onBlankPointerDown when clicking blank canvas stage", () => {
    const onBlankPointerDown = vi.fn();
    render(
      <DataScreenEditViewport
        canvasWidth={1920}
        canvasHeight={1080}
        onBlankPointerDown={onBlankPointerDown}
      >
        <div data-testid="canvas-stage" className="h-[1080px] w-[1920px]" />
      </DataScreenEditViewport>,
    );

    fireEvent.pointerDown(screen.getByTestId("canvas-stage"));
    expect(onBlankPointerDown).toHaveBeenCalledTimes(1);
  });

  it("updates design stage dimensions when canvas size changes", () => {
    const { rerender } = render(
      <DataScreenEditViewport canvasWidth={1920} canvasHeight={1080}>
        <div data-testid="canvas-stage" />
      </DataScreenEditViewport>,
    );

    const stage = screen.getByTestId("data-screen-canvas-stage");
    expect(stage).toHaveAttribute("data-canvas-design-width", "1920");
    expect(stage).toHaveAttribute("data-canvas-design-height", "1080");
    expect(stage).toHaveStyle({ width: "1920px", height: "1080px" });

    rerender(
      <DataScreenEditViewport canvasWidth={2560} canvasHeight={1080}>
        <div data-testid="canvas-stage" />
      </DataScreenEditViewport>,
    );

    expect(screen.getByTestId("data-screen-canvas-stage")).toHaveAttribute(
      "data-canvas-design-width",
      "2560",
    );
    expect(screen.getByTestId("data-screen-canvas-stage")).toHaveStyle({ width: "2560px" });
  });
});
