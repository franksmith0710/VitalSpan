import { describe, expect, it } from "vitest";
import { normalizeHexColor } from "@/components/ui/color-field";
import { resolveCanvasDecorPresetId } from "./dashboardStyleConfig";

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
});
