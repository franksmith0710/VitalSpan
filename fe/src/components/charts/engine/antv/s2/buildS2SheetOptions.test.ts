import { describe, expect, it } from "vitest";
import {
  buildS2SheetOptions,
  resolveS2ColumnWidthByField,
  resolveS2LayoutWidthType,
} from "./buildS2SheetOptions";
import { tableInspectorProfile } from "@/lib/chartTableInspector";

const profile = tableInspectorProfile("table-info")!;

describe("buildS2SheetOptions", () => {
  it("maps column width modes to S2 layoutWidthType", () => {
    expect(resolveS2LayoutWidthType("auto")).toBe("adaptive");
    expect(resolveS2LayoutWidthType("fixed")).toBe("compact");
    expect(resolveS2LayoutWidthType("custom")).toBe("colAdaptive");
  });

  it("converts custom column width percentages to pixel widthByField", () => {
    const widthByField = resolveS2ColumnWidthByField(
      { columnWidthMode: "custom", columnWidths: { region: 30, amount: 70 } },
      ["region", "amount"],
      502,
    );
    expect(widthByField).toEqual({ region: 150, amount: 350 });
  });

  it("applies compact layout for fixed column width mode", () => {
    const options = buildS2SheetOptions({
      profile,
      tableStyle: { columnWidthMode: "fixed" },
      width: 480,
      height: 320,
      plotType: "table-info",
      colorScheme: "light",
    });
    expect(options.style?.layoutWidthType).toBe("compact");
  });

  it("applies widthByField pixels for custom mode", () => {
    const options = buildS2SheetOptions({
      profile,
      tableStyle: {
        columnWidthMode: "custom",
        columnWidths: { a: 25, b: 75 },
      },
      width: 402,
      height: 300,
      plotType: "table-info",
      colorScheme: "light",
      columnFields: ["a", "b"],
    });
    expect(options.style?.layoutWidthType).toBe("colAdaptive");
    expect(options.style?.colCell?.widthByField).toEqual({ a: 100, b: 300 });
  });

  it("disables hover highlight when rowHover is false", () => {
    const options = buildS2SheetOptions({
      profile,
      tableStyle: { rowHover: false },
      width: 400,
      height: 300,
      plotType: "table-info",
      colorScheme: "light",
    });
    expect(options.interaction?.hoverHighlight).toBe(false);
  });

  it("omits pivot totals when showSummary is false", () => {
    const pivotProfile = tableInspectorProfile("table-pivot")!;
    const options = buildS2SheetOptions({
      profile: pivotProfile,
      tableStyle: { showSummary: false },
      width: 400,
      height: 300,
      plotType: "table-pivot",
      colorScheme: "light",
    });
    expect(options.totals).toBeUndefined();
  });
});
