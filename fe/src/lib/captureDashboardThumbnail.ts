import { toBlob } from "html-to-image";

export const DASHBOARD_THUMBNAIL_CAPTURE_ATTR = "data-dashboard-thumbnail-capture";

function syncCanvasPixels(source: HTMLElement, clone: HTMLElement): void {
  const sources = source.querySelectorAll("canvas");
  const clones = clone.querySelectorAll("canvas");
  sources.forEach((src, index) => {
    const dst = clones[index];
    if (!(src instanceof HTMLCanvasElement) || !(dst instanceof HTMLCanvasElement)) return;
    if (src.width === 0 || src.height === 0) return;
    dst.width = src.width;
    dst.height = src.height;
    const ctx = dst.getContext("2d");
    if (ctx) ctx.drawImage(src, 0, 0);
  });
}

export function findDashboardThumbnailCaptureRoot(): HTMLElement | null {
  const stage = document.querySelector<HTMLElement>(
    '[data-testid="pixel-canvas-stage"][data-dashboard-thumbnail-capture]',
  );
  if (stage) return stage;
  return document.querySelector<HTMLElement>(`[${DASHBOARD_THUMBNAIL_CAPTURE_ATTR}]`);
}

async function settlePaint(ms = 600): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function shouldIncludeNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return true;
  if (node.closest("[data-thumbnail-ignore]")) return false;
  return true;
}

/** 截取编辑画布当前真实渲染（保存瞬间），返回 png/webp Blob */
export async function captureDashboardThumbnailBlob(root: HTMLElement): Promise<Blob> {
  document.documentElement.classList.add("dashboard-thumbnail-capture");
  try {
    await settlePaint();
    const base = {
      pixelRatio: 1,
      cacheBust: true,
      filter: shouldIncludeNode,
      onClone: (clonedDoc: Document) => {
        const clonedRoot = clonedDoc.querySelector<HTMLElement>(
          `[${DASHBOARD_THUMBNAIL_CAPTURE_ATTR}]`,
        );
        if (clonedRoot) syncCanvasPixels(root, clonedRoot);
      },
    };

    let blob = await toBlob(root, { ...base, type: "image/png" });
    if (!blob) {
      blob = await toBlob(root, { ...base, type: "image/webp", quality: 0.86 });
    }
    if (!blob) {
      throw new Error("截图生成为空");
    }
    return blob;
  } finally {
    document.documentElement.classList.remove("dashboard-thumbnail-capture");
  }
}
