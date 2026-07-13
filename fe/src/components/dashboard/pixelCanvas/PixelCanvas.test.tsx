import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardLayoutV2, PixelLayoutWidget } from "../layoutUtils";
import { PIXEL_CANVAS_GUTTER, PixelCanvas } from "./PixelCanvas";
import { createPixelPaletteWidget } from "./createPixelWidget";
import { usePixelLayoutHistory } from "./usePixelLayoutHistory";

const widget: PixelLayoutWidget = {
  id: "w1",
  type: "chart",
  title: "图表",
  order: 3,
  x: 100,
  y: 80,
  width: 300,
  height: 200,
};

const layout: DashboardLayoutV2 = {
  version: 2,
  canvas: { width: 1440, height: 900 },
  widgets: [widget],
  globalFilters: [{ id: "region" }],
};

afterEach(cleanup);

function triggerResizeObservers() {
  (
    globalThis as typeof globalThis & {
      __triggerResizeObservers: () => void;
    }
  ).__triggerResizeObservers();
}

function renderCanvas(mode: "edit" | "view", onLayoutChange = vi.fn()) {
  render(
    <PixelCanvas
      mode={mode}
      layout={layout}
      selectedIds={new Set(["w1"])}
      onLayoutChange={onLayoutChange}
      renderWidget={(item) => <button data-pixel-no-drag>{item.title}</button>}
    />,
  );
  return onLayoutChange;
}

describe("PixelCanvas", () => {
  it("commits canonical drag coordinates on pointer up", () => {
    const onChange = renderCanvas("edit");
    fireEvent.pointerDown(screen.getByLabelText("拖动组件"), {
      pointerId: 7,
      clientX: 10,
      clientY: 10,
      button: 0,
    });
    fireEvent.pointerMove(screen.getByTestId("pixel-shape-w1"), {
      pointerId: 7,
      clientX: 110,
      clientY: 60,
    });
    fireEvent.pointerUp(screen.getByTestId("pixel-shape-w1"), {
      pointerId: 7,
      clientX: 110,
      clientY: 60,
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].widgets[0]).toMatchObject({ x: 200, y: 130 });
  });

  it("keeps pointer capture through an out-of-bounds move and releases once", () => {
    const onChange = renderCanvas("edit");
    const drag = screen.getByLabelText("拖动组件");
    const shape = screen.getByTestId("pixel-shape-w1");
    fireEvent.pointerDown(drag, {
      pointerId: 11,
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    expect(shape.hasPointerCapture(11)).toBe(true);
    fireEvent.pointerMove(shape, {
      pointerId: 11,
      clientX: -500,
      clientY: -500,
    });
    fireEvent.pointerUp(shape, {
      pointerId: 11,
      clientX: -500,
      clientY: -500,
    });

    expect(shape.hasPointerCapture(11)).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].widgets[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("cancels an in-progress interaction without writing layout", () => {
    const onChange = renderCanvas("edit");
    fireEvent.pointerDown(screen.getByLabelText("调整组件大小：右下"), {
      pointerId: 8,
      clientX: 0,
      clientY: 0,
      button: 0,
    });
    fireEvent.pointerMove(screen.getByTestId("pixel-shape-w1"), {
      pointerId: 8,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerCancel(screen.getByTestId("pixel-shape-w1"), { pointerId: 8 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("commits the last live rectangle when pointer capture is lost", () => {
    const onChange = renderCanvas("edit");
    fireEvent.pointerDown(screen.getByLabelText("拖动组件"), {
      pointerId: 10,
      clientX: 10,
      clientY: 10,
      button: 0,
    });
    const shape = screen.getByTestId("pixel-shape-w1");
    fireEvent.pointerMove(shape, {
      pointerId: 10,
      clientX: 60,
      clientY: 40,
    });
    shape.releasePointerCapture(10);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].widgets[0]).toMatchObject({ x: 150, y: 110 });
    expect(shape.hasPointerCapture(10)).toBe(false);
    shape.releasePointerCapture(10);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("does not start dragging from widget content", () => {
    const onChange = renderCanvas("edit");
    fireEvent.pointerDown(screen.getByRole("button", { name: "图表" }), {
      pointerId: 9,
      clientX: 0,
      clientY: 0,
      button: 0,
    });
    fireEvent.pointerMove(screen.getByTestId("pixel-shape-w1"), {
      pointerId: 9,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerUp(screen.getByTestId("pixel-shape-w1"), { pointerId: 9 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows DE edit chrome only in edit mode", () => {
    const { unmount } = render(
      <PixelCanvas
        mode="edit"
        layout={layout}
        selectedIds={new Set(["w1"])}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    expect(screen.getByTestId("pixel-edit-bar-w1")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^调整组件大小：/ })).toHaveLength(8);
    unmount();

    render(
      <PixelCanvas
        mode="view"
        layout={layout}
        selectedIds={new Set(["w1"])}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    expect(screen.queryByTestId("pixel-edit-bar-w1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^调整组件大小：/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("pixel-shape-w1")).not.toHaveClass("pixel-shape-selected");
  });

  it("reserves a fixed gutter and keeps edit chrome screen-sized at scale 0.5", () => {
    render(
      <PixelCanvas
        mode="edit"
        layout={{ ...layout, widgets: [{ ...widget, x: 0 }] }}
        selectedIds={new Set(["w1"])}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    const host = screen.getByTestId("pixel-canvas-host");
    Object.defineProperty(host, "clientWidth", { configurable: true, value: 768 });
    act(triggerResizeObservers);

    expect(host).toHaveAttribute("data-pixel-canvas-scale", "0.5");
    expect(screen.getByTestId("pixel-canvas-stage")).toHaveStyle({
      left: `${PIXEL_CANVAS_GUTTER}px`,
    });
    const editBar = screen.getByTestId("pixel-edit-bar-w1");
    expect(editBar).toHaveStyle({
      width: "32px",
      transform: "translateY(-50%) scale(2)",
    });
    expect(Number.parseFloat(editBar.style.left) * 0.5 + PIXEL_CANVAS_GUTTER).toBeGreaterThanOrEqual(
      0,
    );
    const handle = screen.getByTestId("pixel-resize-se");
    const visual = screen.getByTestId("pixel-resize-visual-se");
    expect(Number.parseFloat(handle.style.width) * 0.5).toBe(20);
    expect(Number.parseFloat(visual.style.width) * 0.5).toBe(12);
  });

  it("supports keyboard move and resize without Enter or Space mutations", () => {
    const onChange = renderCanvas("edit");
    const drag = screen.getByLabelText("拖动组件");
    fireEvent.keyDown(drag, { key: "ArrowRight" });
    expect(onChange.mock.calls[0][0].widgets[0]).toMatchObject({ x: 101, y: 80 });

    const handle = screen.getByLabelText("调整组件大小：右下");
    fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });
    expect(onChange.mock.calls[1][0].widgets[0]).toMatchObject({ width: 300, height: 210 });
    fireEvent.keyDown(drag, { key: "Enter" });
    fireEvent.keyDown(handle, { key: " " });
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe("v2 widget creation and history", () => {
  it("creates chart and filter widgets inside the visible canonical viewport", () => {
    const viewport = { x: 400, y: 300, width: 600, height: 400 };
    const chart = createPixelPaletteWidget("bar", [], layout.canvas, viewport);
    const filter = createPixelPaletteWidget(
      { type: "filter", controlType: "date" },
      [chart],
      layout.canvas,
      viewport,
    );

    expect(chart).toMatchObject({ type: "chart", x: 460, y: 340, width: 480, height: 320 });
    expect(filter).toMatchObject({ type: "filter", x: 520, y: 420, width: 360, height: 160 });
  });

  it("undoes and redoes the complete v2 layout without losing metadata", () => {
    const { result } = renderHook(() =>
      usePixelLayoutHistory({ initialLayout: layout, keyboardEnabled: false }),
    );
    const changed: DashboardLayoutV2 = {
      ...layout,
      canvas: { width: 1440, height: 1200 },
      widgets: [{ ...widget, x: 420, width: 520 }],
      globalFilters: [{ id: "country" }],
    };

    act(() => result.current.setLayout(changed));
    expect(result.current.isDirty).toBe(true);
    act(() => result.current.undo());
    expect(result.current.layout).toEqual(layout);
    act(() => result.current.redo());
    expect(result.current.layout).toEqual(changed);
    act(() => result.current.markSaved());
    expect(result.current.isDirty).toBe(false);
  });

  it.each([
    ["input", <input aria-label="history-input" />],
    ["textarea", <textarea aria-label="history-textarea" />],
    ["select", <select aria-label="history-select" />],
    ["contenteditable", <div contentEditable aria-label="history-contenteditable" />],
    ["opt-out region", <div data-pixel-no-shortcut tabIndex={0} aria-label="history-opt-out" />],
  ])("ignores undo shortcuts from %s", (_, control) => {
    const { result } = renderHook(() =>
      usePixelLayoutHistory({ initialLayout: layout, keyboardEnabled: true }),
    );
    const changed = { ...layout, widgets: [{ ...widget, x: 420 }] };
    act(() => result.current.setLayout(changed));
    render(control);
    const target = screen.getByLabelText(/^history-/);
    target.focus();
    fireEvent.keyDown(target, { key: "z", ctrlKey: true });
    expect(result.current.layout).toEqual(changed);
  });

  it("ignores Cmd+Y redo from an opted-out editor region", () => {
    const { result } = renderHook(() =>
      usePixelLayoutHistory({ initialLayout: layout, keyboardEnabled: true }),
    );
    const changed = { ...layout, widgets: [{ ...widget, x: 420 }] };
    act(() => result.current.setLayout(changed));
    act(() => result.current.undo());
    render(<div data-pixel-no-shortcut tabIndex={0} aria-label="redo-opt-out" />);
    const target = screen.getByLabelText("redo-opt-out");
    target.focus();
    fireEvent.keyDown(target, { key: "y", metaKey: true });
    expect(result.current.layout).toEqual(layout);
  });
});
