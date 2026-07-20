import type { S2Options } from "@antv/s2";
import type { ChartDeTableStyle } from "@/lib/chartDeTableStyle";
import {
  resolveTableZebraBg,
} from "@/lib/chartDeTableStyle";
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
};

export function buildS2SheetOptions(input: BuildS2SheetOptionsInput): S2Options {
  const { profile, tableStyle, width, height, plotType, colorScheme, widgetShellBg } = input;
  const themeVars = resolveTableThemeVars(tableStyle, { colorScheme, widgetShellBg });
  const headerBg = themeVars["--dashboard-table-header-bg"];
  const headerFg = themeVars["--dashboard-table-header-fg"];
  const bodyFg = themeVars["--dashboard-table-body-fg"];
  const bodyBg = themeVars["--dashboard-table-body-bg"];
  const borderColor = themeVars["--dashboard-table-border"];
  const cornerBg = themeVars["--dashboard-table-corner-bg"] ?? headerBg;
  const zebraBg = resolveTableZebraBg(tableStyle);
  const wordWrap = tableStyle.wordWrap === true;

  const options: S2Options = {
    ...CANVAS_CSS_TRANSFORM_SUPPORT,
    width: Math.max(width, 120),
    height: Math.max(height, 120),
    showSeriesNumber: profile.showSeriesNumber,
    style: {
      layoutWidthType: tableStyle.columnWidthMode === "fixed" ? "compact" : "adaptive",
      colCell: {
        backgroundColor: headerBg,
        textFill: headerFg,
        horizontalBorderColor: borderColor,
        verticalBorderColor: borderColor,
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

  if (plotType === "table-pivot" && profile.showSummary) {
    options.totals = {
      row: { showGrandTotals: true, showSubTotals: profile.showSubTotals },
      col: { showGrandTotals: profile.showSubTotals },
    };
  }

  if (plotType === "table-normal" && profile.showSubTotals && profile.showSummary) {
    options.totals = {
      row: { showGrandTotals: true },
    };
  }

  if (tableStyle.columnWidthMode === "custom" && tableStyle.columnWidths) {
    options.style = {
      ...options.style,
      colCell: {
        ...options.style?.colCell,
        widthByField: tableStyle.columnWidths,
      },
    };
  }

  if (tableStyle.opacity != null && tableStyle.opacity < 100) {
    options.style = {
      ...options.style,
      backgroundColor: `rgba(255,255,255,${tableStyle.opacity / 100})`,
    };
  }

  return options;
}
