import { describe, expect, it } from "vitest";
import {
  backgroundImageFitSupportsPosition,
  inferDefaultBackgroundImageFitForUrl,
  resolveWidgetBackgroundImageLayerStyle,
} from "./widgetBackgroundImageFit";

describe("widgetBackgroundImageFit", () => {
  it("defaults to stretch for legacy configs", () => {
    expect(resolveWidgetBackgroundImageLayerStyle({})).toEqual({
      backgroundSize: "100% 100%",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    });
  });

  it("maps widthFit to 100% auto and top center default", () => {
    expect(
      resolveWidgetBackgroundImageLayerStyle({ backgroundImageFit: "widthFit" }),
    ).toEqual({
      backgroundSize: "100% auto",
      backgroundPosition: "center top",
      backgroundRepeat: "no-repeat",
    });
  });

  it("respects explicit position override", () => {
    expect(
      resolveWidgetBackgroundImageLayerStyle({
        backgroundImageFit: "contain",
        backgroundImagePosition: "bottom right",
      }),
    ).toMatchObject({
      backgroundSize: "contain",
      backgroundPosition: "bottom right",
    });
  });

  it("infers widthFit for borderless decor and screen headers", () => {
    expect(
      inferDefaultBackgroundImageFitForUrl(
        "/template-assets/packs/borderless-decor-v1/items/decor-bow-deep-cyan.svg",
      ),
    ).toEqual({
      backgroundImageFit: "widthFit",
      backgroundImagePosition: "top center",
    });
    expect(
      inferDefaultBackgroundImageFitForUrl(
        "/template-assets/packs/gov-enterprise-v1/screen-headers/screen-header-de-trapezoid-wing-cyan.svg",
      ),
    ).toEqual({
      backgroundImageFit: "widthFit",
      backgroundImagePosition: "top center",
    });
    expect(inferDefaultBackgroundImageFitForUrl("https://example.com/bg.png")).toBeNull();
  });

  it("stretch does not support position UI", () => {
    expect(backgroundImageFitSupportsPosition("stretch")).toBe(false);
    expect(backgroundImageFitSupportsPosition("widthFit")).toBe(true);
  });
});
