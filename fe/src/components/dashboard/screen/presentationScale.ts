export type PresentationMode = "fit" | "fitWidth" | "fitHeight" | "fill" | "none";

export type PresentationTransform = {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
};

export function computePresentationTransform(
  containerWidth: number,
  containerHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  mode: PresentationMode,
): PresentationTransform {
  const safeContainerW = Math.max(containerWidth, 0);
  const safeContainerH = Math.max(containerHeight, 0);
  const safeCanvasW = Math.max(canvasWidth, 1);
  const safeCanvasH = Math.max(canvasHeight, 1);

  if (mode === "none") {
    const translateX = Math.max(0, (safeContainerW - safeCanvasW) / 2);
    const translateY = Math.max(0, (safeContainerH - safeCanvasH) / 2);
    return { scaleX: 1, scaleY: 1, translateX, translateY };
  }

  if (mode === "fill") {
    const scaleX = safeContainerW / safeCanvasW;
    const scaleY = safeContainerH / safeCanvasH;
    return { scaleX, scaleY, translateX: 0, translateY: 0 };
  }

  let scale = 1;
  if (mode === "fitWidth") {
    scale = safeContainerW / safeCanvasW;
  } else if (mode === "fitHeight") {
    scale = safeContainerH / safeCanvasH;
  } else {
    scale = Math.min(safeContainerW / safeCanvasW, safeContainerH / safeCanvasH);
  }

  const scaledW = safeCanvasW * scale;
  const scaledH = safeCanvasH * scale;
  return {
    scaleX: scale,
    scaleY: scale,
    translateX: Math.max(0, (safeContainerW - scaledW) / 2),
    translateY: Math.max(0, (safeContainerH - scaledH) / 2),
  };
}
