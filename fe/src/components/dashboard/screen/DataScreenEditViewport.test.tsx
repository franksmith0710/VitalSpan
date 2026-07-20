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
});
