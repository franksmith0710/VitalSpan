import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { TableSheet } from "@antv/s2-react";
import { S2Event, type SpreadSheet } from "@antv/s2";
import type { ChartEngineViewProps } from "@/components/charts/engine/types";
import { buildAntvRenderPlan } from "@/components/charts/engine/antv/buildAntvSpec";
import { buildS2DataConfig } from "@/components/charts/engine/antv/s2/buildS2DataConfig";
import { buildS2SheetOptions } from "@/components/charts/engine/antv/s2/buildS2SheetOptions";
import { chartViewModelToRenderSpec } from "@/components/charts/engine/buildChartViewModel";
import {
  embeddedSizeChanged,
} from "@/components/charts/engine/embeddedContainerSize";
import { useEmbeddedChartLiveResize } from "@/hooks/useEmbeddedChartLiveResize";
import { useChartVisualScale } from "@/hooks/useChartVisualScale";
import { usePixelShapePlayer } from "@/components/dashboard/pixelCanvas/pixelShapePlayerContext";
import {
  computeTableSummaryValues,
  DEFAULT_TABLE_PAGE_SIZE,
  mergeChartTableStyle,
  readChartDeTableStyle,
  resolveTableSummaryColumns,
} from "@/lib/chartDeTableStyle";
import { tableInspectorProfile } from "@/lib/chartTableInspector";
import { resolveTableThemeVars } from "@/lib/chartSurfaceTheme";
import { formatTableCellValue } from "@/lib/chartValueFormat";
import { cn } from "@/lib/utils";
import { TablePaginationBar } from "@/components/charts/adapters/TablePaginationBar";

function AntvS2ViewInner(props: ChartEngineViewProps) {
  const {
    viewModel,
    style,
    chartConfig,
    fill = false,
    height = 180,
    width,
    ariaLabel,
    onInteraction,
    onJumpClick,
    drillClickField,
  } = props;
  const sheetRef = useRef<SpreadSheet>();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMeasureRef = useRef({ width: 0, height: 0 });
  const isShapePlaying = usePixelShapePlayer();
  const isShapePlayingRef = useRef(isShapePlaying);
  isShapePlayingRef.current = isShapePlaying;
  const visualScale = useChartVisualScale();
  const [size, setSize] = useState({ width: 400, height: height ?? 180 });
  const [page, setPage] = useState(1);

  const plan = useMemo(() => buildAntvRenderPlan(viewModel), [viewModel]);
  const spec = useMemo(() => chartViewModelToRenderSpec(viewModel), [viewModel]);
  const profile = tableInspectorProfile(viewModel.chartType);
  const tableStyle = useMemo(
    () =>
      mergeChartTableStyle(
        readChartDeTableStyle(chartConfig ?? { chartType: viewModel.chartType }),
        style.deStyle.tableColorStyle,
      ),
    [chartConfig, style.deStyle.tableColorStyle, viewModel.chartType],
  );

  const paginationMode = tableStyle.paginationMode ?? "page";
  const pageSize = tableStyle.pageSize ?? DEFAULT_TABLE_PAGE_SIZE;
  const scrollMode = profile?.showPagination && paginationMode === "scroll";
  const usePagination = profile?.showPagination && paginationMode === "page";

  const allRows = useMemo(
    () => (plan.options.rows as unknown[][]) ?? viewModel.dataset.rows,
    [plan.options.rows, viewModel.dataset.rows],
  );
  const allColumns = useMemo(
    () => (plan.options.columns as string[]) ?? viewModel.dataset.columns,
    [plan.options.columns, viewModel.dataset.columns],
  );

  useEffect(() => {
    setPage(1);
  }, [allRows, pageSize, paginationMode, viewModel.chartType]);

  const pageRows = useMemo(() => {
    if (!usePagination || allRows.length <= pageSize) return allRows;
    return allRows.slice((page - 1) * pageSize, page * pageSize);
  }, [allRows, page, pageSize, usePagination]);

  const totalPages = Math.max(1, Math.ceil(allRows.length / pageSize));
  const paginationHeight = usePagination && allRows.length > pageSize ? 36 : 0;

  const dataCfg = useMemo(() => {
    return buildS2DataConfig({
      plotType: plan.plotType,
      rows: pageRows,
      columns: allColumns,
      spec,
    });
  }, [allColumns, pageRows, plan.plotType, spec]);

  const themeVars = useMemo(
    () =>
      resolveTableThemeVars(tableStyle, {
        colorScheme: style.scheme,
        widgetShellBg: style.widgetShellBg,
      }),
    [style.scheme, style.widgetShellBg, tableStyle],
  );

  const summaryFooter = useMemo(() => {
    if (!profile?.showSummary || plan.plotType !== "table-info") return null;
    const rows = allRows;
    const columns = allColumns;
    const displayCols = dataCfg.fields?.columns ?? columns;
    if (!Array.isArray(displayCols) || displayCols.length === 0) return null;
    const metricFields = viewModel.encoding.metrics.map((m) => m.field).filter(Boolean);
    const summaryCols = resolveTableSummaryColumns(columns, displayCols, rows, {
      metricFields,
      showSummary: tableStyle.showSummary,
    });
    if (summaryCols.length === 0) return null;
    const values = computeTableSummaryValues(columns, displayCols, rows, summaryCols);
    return { displayCols, values };
  }, [
    allColumns,
    allRows,
    dataCfg.fields?.columns,
    plan.plotType,
    profile?.showSummary,
    tableStyle.showSummary,
    viewModel.encoding.metrics,
  ]);

  const footerHeight = (summaryFooter ? 36 : 0) + paginationHeight;

  const columnFields = useMemo(() => {
    const cols = dataCfg.fields?.columns;
    return Array.isArray(cols) ? cols.filter((field): field is string => Boolean(field)) : allColumns;
  }, [allColumns, dataCfg.fields?.columns]);

  const sheetOptions = useMemo(() => {
    if (!profile) return {};
    return buildS2SheetOptions({
      profile,
      tableStyle,
      width: size.width,
      height: Math.max(size.height - footerHeight, 120),
      plotType: plan.plotType,
      colorScheme: style.scheme,
      widgetShellBg: style.widgetShellBg,
      columnFields,
    });
  }, [
    profile,
    tableStyle,
    size.width,
    size.height,
    footerHeight,
    plan.plotType,
    style.scheme,
    style.widgetShellBg,
    columnFields,
  ]);

  const syncSheet = useCallback(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.setDataCfg(dataCfg);
    sheet.setOptions(sheetOptions, true);
    sheet.changeSheetSize(
      typeof sheetOptions.width === "number" ? sheetOptions.width : size.width,
      typeof sheetOptions.height === "number" ? sheetOptions.height : size.height,
    );
    void sheet.render(false);
  }, [dataCfg, sheetOptions, size.width, size.height]);

  const handleSheetMounted = useCallback(
    (sheet: SpreadSheet) => {
      sheetRef.current = sheet;
      syncSheet();
    },
    [syncSheet],
  );

  useEffect(() => {
    syncSheet();
  }, [syncSheet]);

  const remeasure = useMemo(
    () => (force = false) => {
      const el = containerRef.current;
      if (!el) return;
      const next = { width: el.clientWidth || 400, height: el.clientHeight || height || 180 };
      if (!embeddedSizeChanged(next, lastMeasureRef.current)) {
        return;
      }
      lastMeasureRef.current = next;
      const sheetHeight = Math.max(next.height - footerHeight, 120);
      sheetRef.current?.changeSheetSize(next.width, sheetHeight);
      sheetRef.current?.render(false);
      if (!isShapePlayingRef.current || force) {
        setSize(next);
      }
    },
    [footerHeight, height],
  );

  useEmbeddedChartLiveResize(fill, containerRef, () => remeasure(false), () => remeasure(true));

  useEffect(() => {
    if (isShapePlaying) return;
    remeasure();
  }, [isShapePlaying, remeasure]);

  useEffect(() => {
    remeasure();
  }, [visualScale, remeasure]);

  useEffect(() => {
    if (!props.layoutFootprint) return;
    remeasure();
  }, [props.layoutFootprint?.width, props.layoutFootprint?.height, remeasure]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || (!onInteraction && !onJumpClick)) return;
    const handler = (event: {
      target?: { getMeta?: () => { fieldValue?: unknown; valueField?: string } };
    }) => {
      if (onJumpClick) {
        onJumpClick();
        return;
      }
      const meta = event.target?.getMeta?.();
      const value = meta?.fieldValue != null ? String(meta.fieldValue) : "";
      if (!value || !onInteraction) return;
      if (drillClickField && meta?.valueField && meta.valueField !== drillClickField) return;
      onInteraction({ kind: "drill", value, label: value });
    };
    sheet.on(S2Event.DATA_CELL_CLICK, handler);
    return () => {
      sheet.off(S2Event.DATA_CELL_CLICK, handler);
    };
  }, [onInteraction, onJumpClick, drillClickField, dataCfg]);

  if (plan.empty || viewModel.dataset.rows.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-theme-sm text-gray-400 dark:text-gray-500",
          fill ? "absolute inset-0" : "min-h-[180px]",
        )}
        role="status"
        aria-label="暂无数据"
        style={themeVars as CSSProperties}
      >
        暂无数据
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex w-full flex-col", fill ? "absolute inset-0 min-h-0" : "min-h-[120px]")}
      aria-label={ariaLabel}
      data-testid="antv-s2-chart"
      style={{
        ...(themeVars as CSSProperties),
        height: fill ? undefined : height,
        width: width ?? "100%",
        opacity:
          tableStyle.opacity != null && tableStyle.opacity < 100
            ? tableStyle.opacity / 100
            : undefined,
      }}
    >
      <div
        className={cn(
          "min-h-0 flex-1",
          fill ? "flex flex-col" : "",
          scrollMode && "dashboard-scroll overflow-auto overscroll-contain",
        )}
      >
        <TableSheet
          ref={sheetRef}
          onMounted={handleSheetMounted}
          dataCfg={dataCfg}
          options={sheetOptions}
        />
      </div>
      {summaryFooter ? (
        <div
          className="grid shrink-0 border-t-2 border-[var(--dashboard-table-border,#f2f4f7)] bg-[var(--dashboard-table-summary-bg,var(--dashboard-table-header-bg,#f9fafb))] text-[var(--dashboard-table-summary-fg,var(--dashboard-table-body-fg,#344054))]"
          style={{ gridTemplateColumns: `repeat(${summaryFooter.displayCols.length}, minmax(0, 1fr))` }}
        >
          {summaryFooter.displayCols.map((col, index) => {
            const raw = summaryFooter.values[col];
            const text =
              index === 0 && raw == null ? "合计" : raw != null ? formatTableCellValue(raw, style.valueFormat) : "";
            return (
              <div key={col} className="truncate px-2 py-1.5 text-theme-xs font-medium" title={text}>
                {text}
              </div>
            );
          })}
        </div>
      ) : null}
      {usePagination && allRows.length > pageSize ? (
        <TablePaginationBar
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalRows={allRows.length}
          tableStyle={tableStyle}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

export const AntvS2View = memo(AntvS2ViewInner);
