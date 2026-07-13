import "@testing-library/jest-dom/vitest";

const resizeCallbacks = new Set<ResizeObserverCallback>();

class ResizeObserverMock {
  constructor(private readonly callback: ResizeObserverCallback) {
    resizeCallbacks.add(callback);
  }

  observe() {}
  unobserve() {}
  disconnect() {
    resizeCallbacks.delete(this.callback);
  }
}

Object.defineProperty(globalThis, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(globalThis, "__triggerResizeObservers", {
  configurable: true,
  value: () => {
    for (const callback of resizeCallbacks) callback([], {} as ResizeObserver);
  },
});

class PointerEventMock extends MouseEvent {
  pointerId: number;

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
  }
}

Object.defineProperty(globalThis, "PointerEvent", {
  writable: true,
  value: PointerEventMock,
});

const pointerCaptures = new WeakMap<HTMLElement, Set<number>>();

HTMLElement.prototype.hasPointerCapture = function (pointerId: number) {
  return pointerCaptures.get(this)?.has(pointerId) ?? false;
};
HTMLElement.prototype.setPointerCapture = function (pointerId: number) {
  const captured = pointerCaptures.get(this) ?? new Set<number>();
  captured.add(pointerId);
  pointerCaptures.set(this, captured);
};
HTMLElement.prototype.releasePointerCapture = function (pointerId: number) {
  const captured = pointerCaptures.get(this);
  if (!captured?.delete(pointerId)) return;
  this.dispatchEvent(new PointerEvent("lostpointercapture", { pointerId, bubbles: true }));
};
Element.prototype.scrollIntoView = () => {};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
