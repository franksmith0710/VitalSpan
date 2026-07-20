import { describe, expect, it } from "vitest";
import { buildS2SheetOptions } from "./antv/s2/buildS2SheetOptions";
import { withCanvasCssTransformSupport } from "./cssTransformSupport";

describe("cssTransformSupport", () => {
  it("merges supportCSSTransform into chart options", () => {
    expect(withCanvasCssTransformSupport({ data: [] })).toEqual({
      data: [],
      supportCSSTransform: true,
    });
  });

  it("buildS2SheetOptions enables supportCSSTransform", () => {
    const options = buildS2SheetOptions({
      profile: {
        showSeriesNumber: false,
        showPagination: false,
        showSummary: false,
        showSubTotals: false,
      },
      tableStyle: {},
      width: 400,
      height: 240,
      plotType: "table-info",
      colorScheme: "light",
    });
    expect(options.supportCSSTransform).toBe(true);
  });
});
