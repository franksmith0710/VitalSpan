import { createContext, useContext, type ReactNode } from "react";

const DashboardGridPlayerContext = createContext(false);

/** 栅格 RGL 拖拽/缩放中：暂停嵌入图表 React 尺寸上报 */
export function DashboardGridPlayerProvider({
  playing,
  children,
}: {
  playing: boolean;
  children: ReactNode;
}) {
  return (
    <DashboardGridPlayerContext.Provider value={playing}>
      {children}
    </DashboardGridPlayerContext.Provider>
  );
}

export function useDashboardGridPlayer(): boolean {
  return useContext(DashboardGridPlayerContext);
}
