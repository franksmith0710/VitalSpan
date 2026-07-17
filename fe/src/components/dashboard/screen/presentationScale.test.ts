import { describe, expect, it } from "vitest";
import { computePresentationTransform } from "./presentationScale";

describe("presentationScale", () => {
  it("fit scales uniformly to fit container", () => {
    const t = computePresentationTransform(1280, 720, 1920, 1080, "fit");
    expect(t.scaleX).toBeCloseTo(1280 / 1920, 5);
    expect(t.scaleY).toBe(t.scaleX);
    expect(t.scaleX).toBeGreaterThan(0);
    expect(t.scaleX).toBeLessThanOrEqual(1);
  });

  it("fill uses independent axis scales", () => {
    const t = computePresentationTransform(800, 600, 1920, 1080, "fill");
    expect(t.scaleX).toBeCloseTo(800 / 1920, 5);
    expect(t.scaleY).toBeCloseTo(600 / 1080, 5);
  });

  it("none keeps design size", () => {
    const t = computePresentationTransform(800, 600, 1920, 1080, "none");
    expect(t.scaleX).toBe(1);
    expect(t.scaleY).toBe(1);
  });
});
