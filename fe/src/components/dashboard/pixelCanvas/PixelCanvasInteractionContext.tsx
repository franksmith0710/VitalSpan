import { createContext, useContext, type ReactNode } from "react";

export type PixelCanvasInteraction = {
  widgetId: string;
} | null;

const PixelCanvasInteractionContext = createContext<PixelCanvasInteraction>(null);

export function PixelCanvasInteractionProvider({
  interaction,
  children,
}: {
  interaction: PixelCanvasInteraction;
  children: ReactNode;
}) {
  return (
    <PixelCanvasInteractionContext.Provider value={interaction}>
      {children}
    </PixelCanvasInteractionContext.Provider>
  );
}

export function usePixelCanvasInteraction(): PixelCanvasInteraction {
  return useContext(PixelCanvasInteractionContext);
}

/** 当前组件是否正在被拖拽/缩放（内容区跟随 DOM，避免逐帧重算图表） */
export function usePixelWidgetInteracting(widgetId: string): boolean {
  const interaction = usePixelCanvasInteraction();
  return interaction?.widgetId === widgetId;
}
