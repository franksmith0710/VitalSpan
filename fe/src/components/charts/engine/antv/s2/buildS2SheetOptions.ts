import type { S2Options } from "@antv/s2";
import type { ChartDeTableStyle, TableColumnWidthMode } from "@/lib/chartDeTableStyle";
import { resolveTableZebraBg } from "@/lib/chartDeTableStyle";
import type { TableInspectorProfile } from "@/lib/chartTableInspector";
import { resolveTableThemeVars } from "@/lib/chartSurfaceTheme";
import type { ColorScheme } from "@/components/dashboard/dashboardStyleConfig";
import { CANVAS_CSS_TRANSFORM_SUPPORT } from "@/components/charts/engine/cssTransformSupport";

type BuildS2SheetOptionsInput = {
  profile: TableInspectorProfile;
  tableStyle: ChartDeTableStyle;
  width: number;
  height: number;
  plotType: string;
  colorScheme: ColorScheme;
  widgetShellBg?: string;
  /** 列 field 名，供自定义列宽换算为 S2 像素宽 */
  columnFields?: string[];
};

export function resolveS2LayoutWidthType(
  mode: TableColumnWidthMode | undefined,
): "adaptive" | "colAdaptive" | "compact" {
  switch (mode) {
    case "fixed":
      return "compact";
    case "custom":
      return "colAdaptive";
    default:
      return "adaptive";
  }
}

/** DE 列宽比例 % → S2 widthByField 像素（field → px） */
export function resolveS2ColumnWidthByField(
  tableStyle: ChartDeTableStyle,
  columnFields: string[],
  sheetWidth: number,
): Record<string, number> | undefined {
  if (tableStyle.columnWidthMode !== "custom" || columnFields.length === 0) {
    return undefined;
  }
  const widths = tableStyle.columnWidths ?? {};
  const usableWidth = Math.max(sheetWidth - 2, 120);
  const defaultPct = Math.floor(100 / columnFields.length);
  const pctSum = columnFields.reduce((sum, field) => sum + (widths[field] ?? defaultPct), 0);
  const normalized = pctSum > 0 ? pctSum : 100;
  const result: Record<string, number> = {};
  for (const field of columnFields) {
    const pct = widths[field] ?? defaultPct;
    result[field] = Math.max(48, Math.round((usableWidth * pct) / normalized));
  }
  return result;
}

export function buildS2SheetOptions(input: BuildS2SheetOptionsInput): S2Options {
  const {
    profile,
    tableStyle,
    width,
    height,
    plotType,
    colorScheme,
    widgetShellBg,
    columnFields = [],
  } = input;
  const themeVars = resolveTableThemeVars(tableStyle, { colorScheme, widgetShellBg });
  const headerBg = themeVars["--dashboard-table-header-bg"];
  const headerFg = themeVars["--dashboard-table-header-fg"];
  const bodyFg = themeVars["--dashboard-table-body-fg"];
  const bodyBg = themeVars["--dashboard-table-body-bg"];
  const borderColor = themeVars["--dashboard-table-border"];
  const cornerBg = themeVars["--dashboard-table-corner-bg"] ?? headerBg;
  const zebraBg = resolveTableZebraBg(tableStyle);
  const wordWrap = tableStyle.wordWrap === true;
  const sheetWidth = Math.max(width, 120);
  const sheetHeight = Math.max(height, 120);
  const showTotals = tableStyle.showSummary !== false;
  const widthByField = resolveS2ColumnWidthByField(tableStyle, columnFields, sheetWidth);

  const options: S2Options = {
    ...CANVAS_CSS_TRANSFORM_SUPPORT,
    width: sheetWidth,
    height: sheetHeight,
    showSeriesNumber: profile.showSeriesNumber,
    style: {
      layoutWidthType: resolveS2LayoutWidthType(tableStyle.columnWidthMode),
      colCell: {
        backgroundColor: headerBg,
        textFill: headerFg,
        horizontalBorderColor: borderColor,
        verticalBorderColor: borderColor,
        wordWrap,
        ...(widthByField ? { widthByField } : {}),
      },
      cornerCell: {
        backgroundColor: cornerBg,
        textFill: headerFg,
        horizontalBorderColor: borderColor,
        verticalBorderColor: borderColor,
      },
      rowCell: {
        backgroundColor: bodyBg,
        textFill: bodyFg,
        horizontalBorderColor: borderColor,
        verticalBorderColor: borderColor,
        wordWrap,
      },
      dataCell: {
        backgroundColor: tableStyle.columnBg ?? bodyBg,
        textFill: bodyFg,
        horizontalBorderColor: borderColor,
        verticalBorderColor: borderColor,
        wordWrap,
        crossBackgroundColor: zebraBg,
      },
    },
    interaction: {
      hoverHighlight: tableStyle.rowHover !== false,
      selectedCellsSpotlight: false,
    },
  };

  if (plotType === "table-pivot" && profile.showSummary && showTotals) {
    options.totals = {
      row: { showGrandTotals: true, showSubTotals: profile.showSubTotals },
      col: { showGrandTotals: profile.showSubTotals },
    };
  }

  if (plotType === "table-normal" && profile.showSubTotals && profile.showSummary && showTotals) {
    options.totals = {
      row: { showGrandTotals: true },
    };
  }

  return options;
}
