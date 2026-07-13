import { useCallback, useEffect, useMemo, useState } from "react";
import {
  mergeLayoutWidgetIntoPixel,
  pixelWidgetToLayoutWidget,
  prepareDashboardLayout,
  type DashboardCanvasEditor,
} from "@/components/dashboard/dashboardCanvasMode";
import {
  usePixelLayoutHistory,
} from "@/components/dashboard/pixelCanvas";
import {
  type DashboardLayout,
  type DashboardLayoutV2,
  type LayoutWidget,
  type PixelLayoutWidget,
} from "@/components/dashboard/layoutUtils";
import { useLayoutHistory } from "@/hooks/useLayoutHistory";

const EMPTY_PIXEL_LAYOUT: DashboardLayoutV2 = {
  version: 2,
  canvas: { width: 1440, height: 900 },
  widgets: [],
  globalFilters: [],
};

type WidgetUpdate = LayoutWidget[] | ((previous: LayoutWidget[]) => LayoutWidget[]);

function newPixelWidget(widget: LayoutWidget, index: number): PixelLayoutWidget {
  const { colSpan, rowSpan, gridX, gridY, ...base } = widget;
  return {
    ...base,
    x: (gridX ?? 0) * 120,
    y: (gridY ?? index) * 44,
    width: colSpan * 120,
    height: rowSpan * 32 + (rowSpan - 1) * 12,
  };
}

export function useDashboardCanvasState({
  keyboardEnabled,
  pixelEnabled,
  editable,
}: {
  keyboardEnabled: boolean;
  pixelEnabled: boolean;
  editable: boolean;
}) {
  const legacy = useLayoutHistory({ keyboardEnabled: false });
  const pixel = usePixelLayoutHistory({
    initialLayout: EMPTY_PIXEL_LAYOUT,
    keyboardEnabled: false,
  });
  const [editor, setEditor] = useState<DashboardCanvasEditor>(
    pixelEnabled ? "pixel" : "grid",
  );
  const [legacyMeta, setLegacyMeta] = useState<
    Pick<DashboardLayout, "globalFilters" | "styleConfig">
  >({ globalFilters: [] });

  const layout: DashboardLayout =
    editor === "grid"
      ? {
          version: 1,
          widgets: legacy.widgets,
          globalFilters: legacyMeta.globalFilters,
          styleConfig: legacyMeta.styleConfig,
        }
      : pixel.layout;

  const widgets = useMemo(
    () =>
      layout.version === 1
        ? layout.widgets
        : layout.widgets.map(pixelWidgetToLayoutWidget),
    [layout],
  );

  const resetLayout = useCallback(
    (source: DashboardLayout) => {
      const prepared = editable
        ? prepareDashboardLayout(source, pixelEnabled)
        : {
            editor: source.version === 1 ? ("grid" as const) : ("pixel-readonly" as const),
            canSave: false,
            layout: source,
          };
      setEditor(prepared.editor);
      if (prepared.layout.version === 1) {
        legacy.resetWidgets(prepared.layout.widgets);
        setLegacyMeta({
          globalFilters: structuredClone(prepared.layout.globalFilters),
          styleConfig: prepared.layout.styleConfig,
        });
      } else {
        pixel.resetLayout(prepared.layout);
      }
    },
    [editable, legacy.resetWidgets, pixel.resetLayout, pixelEnabled],
  );

  const setWidgets = useCallback(
    (update: WidgetUpdate) => {
      if (editor === "pixel-readonly") return;
      if (layout.version === 1) {
        legacy.setWidgets(update);
        return;
      }
      const previous = layout.widgets.map(pixelWidgetToLayoutWidget);
      const next = typeof update === "function" ? update(previous) : update;
      const previousById = new Map(layout.widgets.map((widget) => [widget.id, widget]));
      pixel.setLayout({
        ...layout,
        widgets: next.map((widget, index) => {
          const old = previousById.get(widget.id);
          return old
            ? mergeLayoutWidgetIntoPixel(old, widget)
            : newPixelWidget(widget, index);
        }),
      });
    },
    [editor, layout, legacy.setWidgets, pixel.setLayout],
  );

  const setPixelLayout = useCallback(
    (next: DashboardLayoutV2) => {
      if (editor !== "pixel") return;
      pixel.setLayout(next);
    },
    [editor, pixel.setLayout],
  );

  const undo = useCallback(() => {
    if (editor === "pixel-readonly") return;
    (editor === "grid" ? legacy.undo : pixel.undo)();
  }, [editor, legacy.undo, pixel.undo]);
  const redo = useCallback(() => {
    if (editor === "pixel-readonly") return;
    (editor === "grid" ? legacy.redo : pixel.redo)();
  }, [editor, legacy.redo, pixel.redo]);

  useEffect(() => {
    if (!keyboardEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-pixel-no-shortcut]',
        )
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardEnabled, redo, undo]);

  return {
    editor,
    canSave: editor !== "pixel-readonly",
    layout,
    widgets,
    setWidgets,
    resetLayout,
    setPixelLayout,
    undo,
    redo,
    canUndo:
      editor !== "pixel-readonly" &&
      (editor === "grid" ? legacy.canUndo : pixel.canUndo),
    canRedo:
      editor !== "pixel-readonly" &&
      (editor === "grid" ? legacy.canRedo : pixel.canRedo),
  };
}
