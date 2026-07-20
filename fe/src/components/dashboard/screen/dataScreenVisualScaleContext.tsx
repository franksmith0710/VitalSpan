import { createContext, useContext, type ReactNode } from "react";

const DataScreenVisualScaleContext = createContext<number | null>(null);

export function DataScreenVisualScaleProvider({
  scale,
  children,
}: {
  scale: number;
  children: ReactNode;
}) {
  const safe = scale > 0 ? scale : 1;
  return (
    <DataScreenVisualScaleContext.Provider value={safe}>
      {children}
    </DataScreenVisualScaleContext.Provider>
  );
}

/** 大屏编辑视口注入的视觉缩放；未包裹时返回 null，由 PixelCanvas 反推 stage bbox */
export function useDataScreenVisualScale(): number | null {
  return useContext(DataScreenVisualScaleContext);
}
