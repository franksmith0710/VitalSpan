import { describe, expect, it } from "vitest";
import {
  buildDashboardGapPatch,
  DEFAULT_CUSTOM_PIXEL_GAP,
  resolveDashboardComponentGap,
  resolveDashboardGapUiState,
} from "./dashboardStyleConfig";

describe("dashboard gap custom mode", () => {
  it("keeps custom preset when gapPreset is custom even if px matches md", () => {
    const ui = resolveDashboardGapUiState(
      { gapPreset: "custom", pixelGutter: 5 },
      { pixel: true },
    );
    expect(ui.preset).toBe("custom");
    expect(ui.hasGap).toBe(true);
  });

  it("selecting custom from md uses non-preset default px for pixel layout", () => {
    const patch = buildDashboardGapPatch(
      { gapPreset: "md", pixelGutter: 5 },
      { type: "preset", preset: "custom" },
      { pixel: true },
    );
    expect(patch).toEqual({ gapPreset: "custom", pixelGutter: DEFAULT_CUSTOM_PIXEL_GAP });
    expect(resolveDashboardGapUiState({ ...patch }, { pixel: true }).preset).toBe("custom");
  });

  it("custom px patch resolves to canvas gap", () => {
    const patch = buildDashboardGapPatch({}, { type: "customPx", px: 7 }, { pixel: true });
    expect(patch).toEqual({ gapPreset: "custom", pixelGutter: 7 });
    expect(resolveDashboardComponentGap(patch, { pixel: true })).toBe(7);
  });

  it("snaps custom px to preset when value hits sm/md/lg", () => {
    expect(buildDashboardGapPatch({}, { type: "customPx", px: 2 }, { pixel: true })).toEqual({
      gapPreset: "sm",
      pixelGutter: 2,
    });
  });
});
