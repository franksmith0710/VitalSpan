import { describe, expect, it } from "vitest";
import { normalizeHexColor } from "@/components/ui/color-field";
import {
  CANVAS_BG_DECOR_PRESETS,
  canvasBackgroundStyle,
  decorPresetPreviewStyle,
  patchDecorNoneStyle,
  patchDecorPresetStyle,
  resolveCanvasDecorPresetId,
} from "./dashboardStyleConfig";

describe("normalizeHexColor", () => {
  it("normalizes 3 and 6 digit hex", () => {
    expect(normalizeHexColor("#abc")).toBe("#aabbcc");
    expect(normalizeHexColor("#AABBCC")).toBe("#aabbcc");
  });

  it("rejects invalid input", () => {
    expect(normalizeHexColor("123")).toBeNull();
    expect(normalizeHexColor("red")).toBeNull();
  });
});

describe("resolveCanvasDecorPresetId", () => {
  it("detects gradient and custom image", () => {
    expect(
      resolveCanvasDecorPresetId({
        canvasBackground: "linear-gradient(160deg, #fff, #000)",
      }),
    ).toBe("gradient-soft");
    expect(
      resolveCanvasDecorPresetId({
        canvasBackgroundImage: "https://cdn.example.com/bg.png",
      }),
    ).toBe("custom");
  });

  it("detects dots preset image", () => {
    const dots = CANVAS_BG_DECOR_PRESETS.find((item) => item.id === "dots");
    expect(
      resolveCanvasDecorPresetId({
        canvasBackgroundImage: dots?.image,
      }),
    ).toBe("dots");
  });
});

describe("canvasBackgroundStyle decor tiles", () => {
  it("repeats dots/grid with solid fill instead of cover", () => {
    const dots = CANVAS_BG_DECOR_PRESETS.find((item) => item.id === "dots");
    expect(
      canvasBackgroundStyle({ canvasBackgroundImage: dots?.image, colorScheme: "light" }),
    ).toEqual({
      backgroundColor: "#f8fafc",
      backgroundImage: `url(${dots?.image})`,
      backgroundSize: "16px 16px",
      backgroundRepeat: "repeat",
    });
  });

  it("uses theme-aware tile on dark scheme", () => {
    const dots = CANVAS_BG_DECOR_PRESETS.find((item) => item.id === "dots");
    const style = canvasBackgroundStyle({
      canvasBackgroundImage: dots?.image,
      colorScheme: "dark",
    });
    expect(style.backgroundColor).toBe("#0f172a");
    expect(style.backgroundImage).toContain("94a3b8");
    expect(style.backgroundSize).toBe("16px 16px");
  });
});

describe("patchDecorPresetStyle", () => {
  it("applies default solid fill when picking dots without custom color", () => {
    expect(patchDecorPresetStyle("dots", { colorScheme: "dark" })).toEqual({
      canvasBackgroundImage: CANVAS_BG_DECOR_PRESETS.find((item) => item.id === "dots")?.image,
      canvasBackground: "#0f172a",
    });
  });

  it("preview styles differ between none and gradient", () => {
    const none = decorPresetPreviewStyle("none", "light");
    const gradient = decorPresetPreviewStyle("gradient-soft", "light");
    expect(none.background ?? none.backgroundColor).not.toEqual(
      gradient.background ?? gradient.backgroundColor,
    );
  });
});

describe("patchDecorNoneStyle", () => {
  it("clears image and gradient-soft preset background", () => {
    const gradient = CANVAS_BG_DECOR_PRESETS.find((item) => item.id === "gradient-soft");
    expect(
      patchDecorNoneStyle({
        canvasBackground: gradient?.canvasBackground,
      }),
    ).toEqual({
      canvasBackgroundImage: undefined,
      canvasBackground: undefined,
    });
  });

  it("keeps custom solid color when clearing decor", () => {
    expect(
      patchDecorNoneStyle({
        canvasBackground: "#57617a",
        canvasBackgroundImage: CANVAS_BG_DECOR_PRESETS.find((item) => item.id === "dots")?.image,
      }),
    ).toEqual({ canvasBackgroundImage: undefined });
  });
});
