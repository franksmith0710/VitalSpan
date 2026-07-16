import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isNativePaletteDragEvent } from "@/lib/dashboardDnd";

/** 组件面板 → 画布拖放进行中（对标 DE 拖入时暂停 shape 移动交互） */
const PaletteDragContext = createContext(false);

export function PaletteDragProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return <PaletteDragContext.Provider value={active}>{children}</PaletteDragContext.Provider>;
}

export function usePaletteDragActive(): boolean {
  return useContext(PaletteDragContext);
}

/** 文档级监听：面板拖拽期间为 true（capture 阶段 dragstart/dragover，同页内拖拽也生效） */
export function usePaletteDocumentDrag(enabled: boolean): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setActive(false);
      return;
    }
    const activate = (event: DragEvent) => {
      if (isNativePaletteDragEvent(event)) setActive(true);
    };
    const end = () => setActive(false);
    document.addEventListener("dragstart", activate, true);
    document.addEventListener("dragover", activate, true);
    document.addEventListener("dragend", end);
    document.addEventListener("drop", end, true);
    return () => {
      document.removeEventListener("dragstart", activate, true);
      document.removeEventListener("dragover", activate, true);
      document.removeEventListener("dragend", end);
      document.removeEventListener("drop", end, true);
    };
  }, [enabled]);

  return active;
}
