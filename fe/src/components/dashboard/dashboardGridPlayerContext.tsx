import { createContext, useContext, type ReactNode } from "react";

const DashboardGridPlayerContext = createContext<string | null>(null);

/** 栅格 RGL 拖拽/缩放中：仅当前交互组件暂停嵌入图表 React 尺寸上报 */
export function DashboardGridPlayerProvider({
  playingWidgetId,
  children,
}: {
  playingWidgetId: string | null;
  children: ReactNode;
}) {
  return (
    <DashboardGridPlayerContext.Provider value={playingWidgetId}>
      {children}
    </DashboardGridPlayerContext.Provider>
  );
}

export function useDashboardGridPlayer(widgetId?: string): boolean {
  const playingWidgetId = useContext(DashboardGridPlayerContext);
  if (widgetId) return playingWidgetId === widgetId;
  return playingWidgetId !== null;
}
