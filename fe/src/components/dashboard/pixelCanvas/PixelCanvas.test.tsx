import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardLayoutV2, LayoutWidget, PixelLayoutWidget } from "../layoutUtils";
import { PIXEL_CANVAS_GUTTER, PixelCanvas, PIXEL_PREVIEW_THROTTLE_MS } from "./PixelCanvas";
import {
  insertClonedPixelWidget,
  insertPixelPaletteWidget,
  placeClonedPixelWidget,
} from "./createPixelWidget";
import { layoutsOverlap } from "./collisionLayout";
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

async function flushPixelPointerFrames() {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) =>
      setTimeout(resolve, PIXEL_PREVIEW_THROTTLE_MS + 8),
    );
  });
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
  it("previews mark-line snap without pushing neighbors during drag", async () => {
    const blocker: PixelLayoutWidget = {
      id: "w2",
      type: "chart",
      title: "下方",
      order: 2,
      x: 100,
      y: 280,
      width: 300,
      height: 200,
    };
    const stackedLayout: DashboardLayoutV2 = {
      ...layout,
      widgets: [widget, blocker],
    };
    const onChange = vi.fn();
    render(
      <PixelCanvas
        mode="edit"
        layout={stackedLayout}
        selectedIds={new Set(["w1"])}
        onLayoutChange={onChange}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    const shape = screen.getByTestId("pixel-shape-w1");
    const blockerShape = screen.getByTestId("pixel-shape-w2");
    expect(blockerShape).toHaveStyle({ top: "280px" });

    fireEvent.pointerDown(screen.getByLabelText("拖动组件"), {
      pointerId: 3,
      clientX: 0,
      clientY: 0,
      button: 0,
    });
    fireEvent.pointerMove(document, {
      pointerId: 3,
      clientX: 0,
      clientY: 120,
    });
    await flushPixelPointerFrames();

    expect(blockerShape).toHaveStyle({ top: "280px" });
    fireEvent.pointerUp(shape, { pointerId: 3, clientX: 0, clientY: 120 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(layoutsOverlap(onChange.mock.calls[0][0], 0)).toBe(false);
    expect(onChange.mock.calls[0][0].widgets.find((item: PixelLayoutWidget) => item.id === "w2")).toMatchObject({
      y: 0,
    });
  });

  it("applies DE reflow to neighbors on pointer up after resize", async () => {
    const blocker: PixelLayoutWidget = {
      id: "w2",
      type: "chart",
      title: "下方",
      order: 2,
      x: 100,
      y: 280,
      width: 300,
      height: 200,
    };
    const stackedLayout: DashboardLayoutV2 = {
      ...layout,
      widgets: [widget, blocker],
    };
    const onChange = vi.fn();
    render(
      <PixelCanvas
        mode="edit"
        layout={stackedLayout}
        selectedIds={new Set(["w1"])}
        onLayoutChange={onChange}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    const shape = screen.getByTestId("pixel-shape-w1");
    const blockerShape = screen.getByTestId("pixel-shape-w2");
    const handle = screen.getByLabelText("调整组件大小：右下");
    expect(blockerShape).toHaveStyle({ top: "280px" });

    fireEvent.pointerDown(handle, {
      pointerId: 4,
      clientX: 0,
      clientY: 0,
      button: 0,
    });
    fireEvent.pointerMove(document, { pointerId: 4, clientX: 0, clientY: 1 });
    fireEvent.pointerMove(document, { pointerId: 4, clientX: 0, clientY: 120 });
    await flushPixelPointerFrames();

    expect(blockerShape).toHaveStyle({ top: "280px" });
    fireEvent.pointerUp(shape, { pointerId: 4, clientX: 0, clientY: 120 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(layoutsOverlap(onChange.mock.calls[0][0], 0)).toBe(false);
    expect(onChange.mock.calls[0][0].widgets.find((item: PixelLayoutWidget) => item.id === "w2")).toMatchObject({
      y: 400,
    });
  });

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

  it("clamps move to canvas bounds on document pointerup", () => {
    const onChange = renderCanvas("edit");
    const drag = screen.getByLabelText("拖动组件");
    fireEvent.pointerDown(drag, {
      pointerId: 11,
      clientX: 100,
      clientY: 100,
      button: 0,
    });
    fireEvent.pointerMove(document, {
      pointerId: 11,
      clientX: -500,
      clientY: -500,
    });
    fireEvent.pointerUp(document, {
      pointerId: 11,
      clientX: -500,
      clientY: -500,
    });

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
    fireEvent.pointerMove(document, {
      pointerId: 8,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerCancel(document, { pointerId: 8 });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("commits the last live rectangle on document pointerup", () => {
    const onChange = renderCanvas("edit");
    fireEvent.pointerDown(screen.getByLabelText("拖动组件"), {
      pointerId: 10,
      clientX: 10,
      clientY: 10,
      button: 0,
    });
    fireEvent.pointerMove(document, {
      pointerId: 10,
      clientX: 60,
      clientY: 40,
    });
    fireEvent.pointerUp(document, { pointerId: 10, clientX: 60, clientY: 40 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].widgets[0]).toMatchObject({ x: 150, y: 110 });
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

  it("clears selection when clicking blank canvas content outside the stage", () => {
    const onClearSelection = vi.fn();
    render(
      <PixelCanvas
        mode="edit"
        layout={layout}
        selectedIds={new Set(["w1"])}
        onClearSelection={onClearSelection}
        onLayoutChange={vi.fn()}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );

    fireEvent.pointerDown(screen.getByTestId("pixel-canvas-content"));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("clears selection when clicking blank host padding", () => {
    const onClearSelection = vi.fn();
    render(
      <PixelCanvas
        mode="edit"
        layout={layout}
        selectedIds={new Set(["w1"])}
        onClearSelection={onClearSelection}
        onLayoutChange={vi.fn()}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );

    fireEvent.pointerDown(screen.getByTestId("pixel-canvas-host"));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
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
    expect(screen.getByTestId("canvas-mark-line")).toBeInTheDocument();
    expect(document.getElementById("editor-canvas-main")).toBeTruthy();
    expect(document.getElementById("shape-id-w1")).toBeTruthy();
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
    expect(screen.queryByTestId("canvas-mark-line")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^调整组件大小：/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("pixel-shape-w1")).not.toHaveClass("pixel-shape-selected");
  });

  it("toggles auxiliary grid overlay and mark-line snap from chrome config", () => {
    const { rerender } = render(
      <PixelCanvas
        mode="edit"
        layout={layout}
        styleConfig={{ chrome: { showAuxiliaryGrid: true } }}
        selectedIds={new Set(["w1"])}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    expect(screen.getByTestId("pixel-canvas-aux-grid")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-mark-line")).toBeInTheDocument();

    rerender(
      <PixelCanvas
        mode="edit"
        layout={layout}
        styleConfig={{ chrome: { showAuxiliaryGrid: false } }}
        selectedIds={new Set(["w1"])}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    expect(screen.queryByTestId("pixel-canvas-aux-grid")).not.toBeInTheDocument();
    expect(screen.getByTestId("canvas-mark-line")).toBeInTheDocument();
  });

  it("does not compact intentional outer gaps on commit", async () => {
    const spacedLayout: DashboardLayoutV2 = {
      ...layout,
      widgets: [
        widget,
        {
          id: "w2",
          type: "chart",
          title: "右",
          order: 2,
          x: 420,
          y: 0,
          width: 300,
          height: 200,
        },
      ],
    };
    const onChange = vi.fn();
    render(
      <PixelCanvas
        mode="edit"
        layout={spacedLayout}
        styleConfig={{ chrome: { showAuxiliaryGrid: false } }}
        selectedIds={new Set(["w2"])}
        onLayoutChange={onChange}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    expect(screen.getByTestId("pixel-shape-w2")).toHaveStyle({ left: "420px" });

    const shape = screen.getByTestId("pixel-shape-w2");
    fireEvent.pointerDown(screen.getByLabelText("拖动组件"), {
      pointerId: 9,
      clientX: 0,
      clientY: 0,
      button: 0,
    });
    fireEvent.pointerMove(document, { pointerId: 9, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(shape, { pointerId: 9, clientX: 0, clientY: 0 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].widgets.find((item: PixelLayoutWidget) => item.id === "w2")?.x).toBe(420);
  });

  it.each([1, 0.5, 0.25])(
    "keeps resize handles inside the host at scale %s",
    async (expectedScale) => {
    const hostWidth = 1440 * expectedScale;
    const hostHeight = 320 * expectedScale;
    render(
      <PixelCanvas
        mode="edit"
        layout={{ ...layout, widgets: [{ ...widget, x: 0 }], canvas: { width: 1440, height: 320 } }}
        selectedIds={new Set(["w1"])}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    const host = screen.getByTestId("pixel-canvas-host");
    Object.defineProperties(host, {
      clientWidth: { configurable: true, value: hostWidth },
      clientHeight: { configurable: true, value: hostHeight },
    });
    await act(async () => {
      triggerResizeObservers();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

    expect(host).toHaveAttribute("data-pixel-canvas-scale", String(expectedScale));
    expect(screen.getByTestId("pixel-canvas-stage")).toHaveStyle({
      left: "0px",
      transform: `scale(${expectedScale})`,
    });
    const handle = screen.getByTestId("pixel-resize-se");
    const visual = screen.getByTestId("pixel-resize-visual-se");
    expect(Number.parseFloat(handle.style.width) * expectedScale).toBe(28);
    expect(Number.parseFloat(visual.style.width) * expectedScale).toBe(12);
    },
  );

  it("reports the visible canonical viewport after resize and scroll", async () => {
    const onViewportChange = vi.fn();
    render(
      <PixelCanvas
        mode="edit"
        layout={layout}
        onViewportChange={onViewportChange}
        renderWidget={(item) => <span>{item.title}</span>}
      />,
    );
    const host = screen.getByTestId("pixel-canvas-host");
    Object.defineProperties(host, {
      clientWidth: { configurable: true, value: 720 },
      clientHeight: { configurable: true, value: 300 },
      scrollLeft: { configurable: true, writable: true, value: 200 },
      scrollTop: { configurable: true, writable: true, value: 100 },
    });
    await act(async () => {
      triggerResizeObservers();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    fireEvent.scroll(host);

    expect(onViewportChange).toHaveBeenLastCalledWith({
      x: 400,
      y: 200,
      width: 1040,
      height: 120,
    });
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
  it("creates chart and filter widgets in seamless open slots", () => {
    const chartLayout = insertPixelPaletteWidget("bar", {
      version: 2,
      canvas: layout.canvas,
      widgets: [],
      globalFilters: [],
    });
    const chart = chartLayout.widgets[0]!;
    const filterLayout = insertPixelPaletteWidget(
      { type: "filter", controlType: "date" },
      chartLayout,
    );
    const filter = filterLayout.widgets.find((item) => item.type === "filter")!;

    expect(chart).toMatchObject({ type: "chart", x: 0, y: 0, width: 480, height: 300 });
    expect(filter).toMatchObject({ type: "filter", x: 480, y: 0, width: 320, height: 140 });
    expect(layoutsOverlap(filterLayout, 0)).toBe(false);
  });

  it("places a reused v1 widget in v2 without losing cloned content identity", () => {
    const cloned: LayoutWidget = {
      id: "clone-1",
      type: "text",
      title: "复用说明",
      order: 8,
      colSpan: 6,
      rowSpan: 2,
      textConfig: { content: "复用内容", variant: "plain" },
    };
    const placed = placeClonedPixelWidget(
      cloned,
      layout.widgets,
      layout.canvas,
      { x: 400, y: 300, width: 600, height: 400 },
    );
    expect(placed).toMatchObject({
      id: "clone-1",
      title: "复用说明",
      order: 8,
      textConfig: { content: "复用内容" },
      x: 400,
      y: 0,
      width: 480,
      height: 180,
    });
    expect(placed).not.toHaveProperty("colSpan");
  });

  it("preserves source pixel geometry when reusing from a v2 dashboard", () => {
    const cloned: LayoutWidget = {
      id: "clone-2",
      type: "chart",
      title: "来源图表",
      order: 3,
      colSpan: 6,
      rowSpan: 4,
      chartConfig: {
        chartType: "bar",
        chartId: "clone-2",
        mode: "sql",
        dataSourceId: "00000000-0000-4000-8000-000000000001",
        sql: "SELECT 1",
        dimensions: [{ field: "region" }],
        metrics: [{ field: "value" }],
      },
    };
    const sourcePixel: PixelLayoutWidget = {
      id: "clone-2",
      type: "chart",
      title: "来源图表",
      order: 3,
      x: 120,
      y: 240,
      width: 600,
      height: 280,
      chartConfig: cloned.chartConfig,
    };
    const placed = placeClonedPixelWidget(
      cloned,
      layout.widgets,
      layout.canvas,
      { x: 400, y: 300, width: 600, height: 400 },
      sourcePixel,
    );
    expect(placed.width).toBe(600);
    expect(placed.height).toBe(280);
    expect(placed.title).toBe("来源图表");
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
