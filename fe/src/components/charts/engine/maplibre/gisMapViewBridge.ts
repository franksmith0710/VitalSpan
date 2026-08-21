import type { GisProjectView } from "@/components/charts/engine/maplibre/gisProject";

type CaptureFn = () => GisProjectView | null;

const captureByWidgetId = new Map<string, CaptureFn>();

/** 编辑态：GIS 地图实例注册当前相机读取（供样式栏「读取当前视角」） */
export function registerGisMapViewCapture(widgetId: string, capture: CaptureFn): () => void {
  captureByWidgetId.set(widgetId, capture);
  return () => {
    if (captureByWidgetId.get(widgetId) === capture) {
      captureByWidgetId.delete(widgetId);
    }
  };
}

export function captureGisMapViewCamera(widgetId: string): GisProjectView | null {
  return captureByWidgetId.get(widgetId)?.() ?? null;
}
