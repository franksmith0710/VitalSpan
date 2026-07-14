import { createContext, useContext, type ReactNode } from "react";

const PixelCanvasScaleContext = createContext(1);

export function PixelCanvasScaleProvider({
  scale,
  children,
}: {
  scale: number;
  children: ReactNode;
}) {
  return (
    <PixelCanvasScaleContext.Provider value={scale > 0 ? scale : 1}>
      {children}
    </PixelCanvasScaleContext.Provider>
  );
}

export function usePixelCanvasScale(): number {
  return useContext(PixelCanvasScaleContext);
}
