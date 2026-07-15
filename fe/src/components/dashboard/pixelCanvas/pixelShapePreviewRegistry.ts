import type { PixelRect } from "./geometry";

export type PixelShapePreviewSync = (rect: PixelRect) => void;

export function createPixelShapePreviewRegistry() {
  const syncById = new Map<string, PixelShapePreviewSync>();

  return {
    register(widgetId: string, sync: PixelShapePreviewSync) {
      syncById.set(widgetId, sync);
      return () => {
        syncById.delete(widgetId);
      };
    },
    applyAll(positions: Map<string, PixelRect>) {
      for (const [widgetId, rect] of positions) {
        syncById.get(widgetId)?.(rect);
      }
    },
    applyOne(widgetId: string, rect: PixelRect) {
      syncById.get(widgetId)?.(rect);
    },
    reset(widgets: Array<{ id: string } & PixelRect>) {
      for (const widget of widgets) {
        const { id, x, y, width, height } = widget;
        syncById.get(id)?.({ x, y, width, height });
      }
    },
  };
}
