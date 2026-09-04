import { afterEach, describe, expect, it, vi } from "vitest";
import { mountGisGlobeHaloOverlay } from "@/components/charts/engine/maplibre/gisGlobeHalo";

describe("mountGisGlobeHaloOverlay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes requestPaint and binds map render sync after map becomes available", () => {
    const wrapper = document.createElement("div");
    Object.defineProperty(wrapper, "clientWidth", { value: 400, configurable: true });
    Object.defineProperty(wrapper, "clientHeight", { value: 300, configurable: true });

    let map: {
      on: ReturnType<typeof vi.fn>;
      off: ReturnType<typeof vi.fn>;
      isStyleLoaded: () => boolean;
      getCanvasContainer: () => HTMLElement;
      getCanvas: () => HTMLCanvasElement;
    } | null = null;

    const handle = mountGisGlobeHaloOverlay(
      wrapper,
      () => map as never,
      () => ({ preset: "night", projection: "globe", effects: { enabled: true } }),
    );

    expect(typeof handle.requestPaint).toBe("function");
    expect(typeof handle.dispose).toBe("function");

    const listeners = new Map<string, () => void>();
    const canvasContainer = document.createElement("div");
    const mapCanvas = document.createElement("canvas");
    canvasContainer.append(mapCanvas);

    map = {
      on: vi.fn((event: string, cb: () => void) => {
        listeners.set(event, cb);
      }),
      off: vi.fn(),
      isStyleLoaded: () => false,
      getCanvasContainer: () => canvasContainer,
      getCanvas: () => mapCanvas,
    };

    handle.requestPaint();
    expect(map.on).toHaveBeenCalled();

    handle.dispose();
  });
});
