import type { CSSProperties } from "react";
import {
  CANVAS_RULER_SIZE_PX,
  DATA_SCREEN_RULER_BG,
  DATA_SCREEN_RULER_EDGE,
  DATA_SCREEN_RULER_LABEL,
} from "./canvasRulerUtils";

/** 标尺角块：与尺同底色、不拦截指针事件 */
export const canvasRulerCornerClass =
  "pointer-events-none relative z-0 shrink-0 border-b border-r border-[var(--canvas-ruler-edge)] bg-[var(--canvas-ruler-bg)]";

export const canvasRulerCornerStyle = {
  width: CANVAS_RULER_SIZE_PX,
  height: CANVAS_RULER_SIZE_PX,
} satisfies CSSProperties;

export const canvasRulerSurfaceClass =
  "pointer-events-none relative z-[1] shrink-0 overflow-hidden bg-[var(--canvas-ruler-bg)]";

export function canvasRulerChromeVars(): CSSProperties {
  return {
    "--canvas-ruler-size": `${CANVAS_RULER_SIZE_PX}px`,
    "--canvas-ruler-bg": DATA_SCREEN_RULER_BG,
    "--canvas-ruler-edge": DATA_SCREEN_RULER_EDGE,
    "--canvas-ruler-label": DATA_SCREEN_RULER_LABEL,
  } as CSSProperties;
}
