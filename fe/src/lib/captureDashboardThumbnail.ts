import { toBlob, toPng } from "html-to-image";

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

function resolveCaptureSize(root: HTMLElement): { width: number; height: number } {
  const width = Math.round(
    Number(root.dataset.canvasDesignWidth) || root.offsetWidth || root.clientWidth,
  );
  const height = Math.round(
    Number(root.dataset.canvasDesignHeight) || root.offsetHeight || root.clientHeight,
  );
  if (width < 8 || height < 8) {
    throw new Error(`截图区域尺寸无效（${width}×${height}）`);
  }
  return { width, height };
}

async function settlePaint(ms = 1_200): Promise<void> {
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

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** 截取编辑画布当前真实渲染（保存瞬间），返回 png/webp Blob */
export async function captureDashboardThumbnailBlob(root: HTMLElement): Promise<Blob> {
  const { width, height } = resolveCaptureSize(root);
  document.documentElement.classList.add("dashboard-thumbnail-capture");
  try {
    await settlePaint();
    const base = {
      width,
      height,
      canvasWidth: width,
      canvasHeight: height,
      pixelRatio: 1,
      cacheBust: true,
      skipFonts: true,
      backgroundColor: "#0d1117",
      filter: shouldIncludeNode,
      onClone: (clonedDoc: Document) => {
        const clonedRoot =
          clonedDoc.querySelector<HTMLElement>(`[${DASHBOARD_THUMBNAIL_CAPTURE_ATTR}]`) ??
          clonedDoc.querySelector<HTMLElement>('[data-testid="pixel-canvas-stage"]');
        if (clonedRoot) syncCanvasPixels(root, clonedRoot);
      },
    };

    let blob = await toBlob(root, { ...base, type: "image/png" });
    if (!blob) {
      const dataUrl = await toPng(root, base);
      if (dataUrl) blob = dataUrlToBlob(dataUrl);
    }
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
