import { useCallback, useEffect, useRef, useState } from "react";

const MIN_COL_PX = 56;
const MIN_ROW_PX = 28;
const DEFAULT_COL_PX = 96;
const DEFAULT_SERIES_PX = 48;
const DEFAULT_ROW_PX = 36;

export type TableLayoutResizeState = {
  columnWidthsPx: Record<string, number>;
  seriesColumnWidthPx: number;
  rowHeightPx: number;
};

type UseTableLayoutResizeOptions = {
  columns: string[];
  showSeriesNumber: boolean;
  initial: Partial<TableLayoutResizeState>;
  enabled: boolean;
  onCommit?: (patch: Partial<TableLayoutResizeState>) => void;
};

export function defaultColumnWidthPx(field: string, columns: string[]): number {
  return initialWidthForField(field, columns);
}

function initialWidthForField(field: string, columns: string[]): number {
  if (field === "__vs_series__") return DEFAULT_SERIES_PX;
  const label = field;
  return Math.max(MIN_COL_PX, Math.min(180, label.length * 10 + 40));
}

function buildInitialState(
  columns: string[],
  showSeriesNumber: boolean,
  initial: Partial<TableLayoutResizeState>,
): TableLayoutResizeState {
  const columnWidthsPx: Record<string, number> = {};
  for (const col of columns) {
    columnWidthsPx[col] =
      initial.columnWidthsPx?.[col] ?? initialWidthForField(col, columns);
  }
  return {
    columnWidthsPx,
    seriesColumnWidthPx:
      initial.seriesColumnWidthPx ??
      (showSeriesNumber ? DEFAULT_SERIES_PX : 0),
    rowHeightPx: initial.rowHeightPx ?? DEFAULT_ROW_PX,
  };
}

type DragTarget =
  | { kind: "column"; field: string; startX: number; startWidth: number }
  | { kind: "series"; startX: number; startWidth: number }
  | { kind: "row"; startY: number; startHeight: number };

export function useTableLayoutResize({
  columns,
  showSeriesNumber,
  initial,
  enabled,
  onCommit,
}: UseTableLayoutResizeOptions) {
  const [layout, setLayout] = useState<TableLayoutResizeState>(() =>
    buildInitialState(columns, showSeriesNumber, initial),
  );
  const dragRef = useRef<DragTarget | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  useEffect(() => {
    setLayout(buildInitialState(columns, showSeriesNumber, initial));
  }, [columns.join("|"), showSeriesNumber, initial.columnWidthsPx, initial.rowHeightPx, initial.seriesColumnWidthPx]);

  const commit = useCallback(() => {
    if (!onCommit) return;
    const current = layoutRef.current;
    onCommit({
      columnWidthsPx: current.columnWidthsPx,
      seriesColumnWidthPx: showSeriesNumber ? current.seriesColumnWidthPx : undefined,
      rowHeightPx: current.rowHeightPx,
    });
  }, [onCommit, showSeriesNumber]);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.kind === "row") {
        const next = Math.max(MIN_ROW_PX, drag.startHeight + (event.clientY - drag.startY));
        setLayout((prev) => ({ ...prev, rowHeightPx: next }));
        return;
      }
      const delta = event.clientX - drag.startX;
      const next = Math.max(MIN_COL_PX, drag.startWidth + delta);
      if (drag.kind === "series") {
        setLayout((prev) => ({ ...prev, seriesColumnWidthPx: next }));
        return;
      }
      setLayout((prev) => ({
        ...prev,
        columnWidthsPx: { ...prev.columnWidthsPx, [drag.field]: next },
      }));
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      commit();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [commit, enabled]);

  const startColumnResize = useCallback(
    (field: string, event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      event.preventDefault();
      event.stopPropagation();
      const th = event.currentTarget.closest("th");
      const startWidth = th?.getBoundingClientRect().width ?? DEFAULT_COL_PX;
      dragRef.current = { kind: "column", field, startX: event.clientX, startWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [enabled],
  );

  const startSeriesResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || !showSeriesNumber) return;
      event.preventDefault();
      event.stopPropagation();
      const th = event.currentTarget.closest("th");
      const startWidth = th?.getBoundingClientRect().width ?? DEFAULT_SERIES_PX;
      dragRef.current = { kind: "series", startX: event.clientX, startWidth };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [enabled, showSeriesNumber],
  );

  const startRowResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        kind: "row",
        startY: event.clientY,
        startHeight: layoutRef.current.rowHeightPx,
      };
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [enabled],
  );

  return {
    layout,
    startColumnResize,
    startSeriesResize,
    startRowResize,
    MIN_COL_PX,
    DEFAULT_COL_PX,
  };
}
