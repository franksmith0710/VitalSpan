import { createContext, useContext, type ReactNode } from "react";

const PixelCanvasScaleContext = createContext(1);
const PixelCanvasDesignViewportContext = createContext(false);

export function PixelCanvasScaleProvider({
  scale,
  designViewportLocked = false,
  children,
}: {
  scale: number;
  designViewportLocked?: boolean;
  children: ReactNode;
}) {
  return (
    <PixelCanvasScaleContext.Provider value={scale > 0 ? scale : 1}>
      <PixelCanvasDesignViewportContext.Provider value={designViewportLocked}>
        {children}
      </PixelCanvasDesignViewportContext.Provider>
    </PixelCanvasScaleContext.Provider>
  );
}

export function usePixelCanvasScale(): number {
  return useContext(PixelCanvasScaleContext);
}

/** 外层 CanvasScaleViewport 已缩放时，不再对标题字号做二次补偿 */
export function usePixelCanvasDesignViewportLocked(): boolean {
  return useContext(PixelCanvasDesignViewportContext);
}
