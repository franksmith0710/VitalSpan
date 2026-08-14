import { afterEach, describe, expect, it } from "vitest";
import {
  assertUsableImageBlob,
  coverCropFromTop,
  findDashboardThumbnailCaptureRoot,
  fitThumbnailSize,
  measureCaptureBox,
  resolveCaptureBackground,
  resolveVisibleCaptureTarget,
  snapshotCanvasesForHtmlCapture,
} from "./captureDashboardThumbnail";

function buildCaptureDom(scale = "0.42"): HTMLElement {
  document.body.innerHTML = `
    <div data-testid="pixel-canvas-host" style="width: 800px; height: 500px; overflow: auto; background: rgb(245, 247, 250);">
      <div data-testid="pixel-canvas-content" style="width: 620px; height: 480px;">
        <div
          data-testid="pixel-canvas-stage"
          data-dashboard-thumbnail-capture=""
          data-canvas-design-width="1440"
          data-canvas-design-height="900"
          style="position: absolute; left: 48px; top: 0; width: 1440px; height: 900px; transform: scale(${scale}); transform-origin: top left;"
        >
          <div data-testid="pixel-canvas-artboard" style="background: rgb(255, 255, 255);"></div>
        </div>
      </div>
    </div>
  `;
  return document.querySelector<HTMLElement>('[data-testid="pixel-canvas-stage"]')!;
}

describe("captureDashboardThumbnail", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("prefers the visible host over the scaled stage", () => {
    buildCaptureDom();
    const root = findDashboardThumbnailCaptureRoot();
    expect(root?.dataset.testid).toBe("pixel-canvas-host");
  });

  it("resolveVisibleCaptureTarget does not rewrite stage transform", () => {
    const stage = buildCaptureDom("0.42");
    const target = resolveVisibleCaptureTarget(stage);
    expect(target.dataset.testid).toBe("pixel-canvas-host");
    expect(stage.style.transform).toBe("scale(0.42)");
  });

  it("coverCropFromTop keeps full width and trims extra height", () => {
    expect(coverCropFromTop(1600, 4000, 16 / 10)).toEqual({ width: 1600, height: 1000 });
    expect(coverCropFromTop(1600, 900, 16 / 10)).toEqual({ width: 1600, height: 900 });
  });

  it("fitThumbnailSize downscales wide data-screen captures", () => {
    expect(fitThumbnailSize(1920, 1080)).toEqual({ width: 960, height: 540 });
    expect(fitThumbnailSize(1600, 4000)).toEqual({ width: 960, height: 600 });
    expect(fitThumbnailSize(800, 500)).toEqual({ width: 800, height: 500 });
  });

  it("resolveCaptureBackground prefers artboard background", () => {
    const sourceRoot = buildCaptureDom();
    expect(resolveCaptureBackground(sourceRoot)).toBe("rgb(255, 255, 255)");
  });

  it("assertUsableImageBlob rejects empty captures", () => {
    expect(() => assertUsableImageBlob(new Blob([]))).toThrow(/空/);
    expect(() => assertUsableImageBlob(new Blob([new Uint8Array(32)]))).toThrow(/空/);
    expect(() => assertUsableImageBlob(new Blob([new Uint8Array(256)]))).not.toThrow();
  });

  it("measureCaptureBox uses client size", () => {
    const el = document.createElement("div");
    Object.defineProperty(el, "clientWidth", { value: 800 });
    Object.defineProperty(el, "clientHeight", { value: 500 });
    el.getBoundingClientRect = () =>
      ({
        width: 800,
        height: 500,
        top: 0,
        left: 0,
        bottom: 500,
        right: 800,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    expect(measureCaptureBox(el)).toEqual({ width: 800, height: 500 });
  });

  it("snapshotCanvasesForHtmlCapture hides canvas even when toDataURL throws", () => {
    const host = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    canvas.toDataURL = () => {
      throw new DOMException("tainted", "SecurityError");
    };
    host.appendChild(canvas);
    document.body.appendChild(host);

    const restore = snapshotCanvasesForHtmlCapture(host);
    expect(canvas.getAttribute("data-thumbnail-canvas-hide")).toBe("");
    expect(canvas.style.display).toBe("none");
    expect(host.querySelector("[data-thumbnail-canvas-snapshot]")).toBeTruthy();

    restore();
    expect(canvas.getAttribute("data-thumbnail-canvas-hide")).toBeNull();
    expect(canvas.style.display).toBe("");
    expect(host.querySelector("[data-thumbnail-canvas-snapshot]")).toBeNull();
    host.remove();
  });
});
