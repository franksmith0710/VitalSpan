import type { CSSProperties } from "react";
import {
  CANVAS_RULER_SIZE_PX,
  DATA_SCREEN_RULER_BG,
  DATA_SCREEN_RULER_EDGE,
} from "./canvasRulerUtils";

/** 标尺角块与横/纵尺共享的表面样式（固定色，不跟主题） */
export const canvasRulerSurfaceStyle = {
  width: CANVAS_RULER_SIZE_PX,
  height: CANVAS_RULER_SIZE_PX,
  backgroundColor: DATA_SCREEN_RULER_BG,
} satisfies CSSProperties;

export const canvasRulerSurfaceClass =
  "relative shrink-0 overflow-hidden bg-[var(--canvas-ruler-bg)]";

export function canvasRulerChromeVars(): CSSProperties {
  return {
    "--canvas-ruler-size": `${CANVAS_RULER_SIZE_PX}px`,
    "--canvas-ruler-bg": DATA_SCREEN_RULER_BG,
    "--canvas-ruler-edge": DATA_SCREEN_RULER_EDGE,
  } as CSSProperties;
}
