import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createScreenBorderSparkle } from "@/lib/screenBorderSparkle";
import { ScreenBorderDisplay } from "./ScreenBorderDisplay";

const sparkle = createScreenBorderSparkle({ id: "sparkle-test-1" });

afterEach(cleanup);

describe("ScreenBorderDisplay", () => {
  it("isolates sparkle SVG defs across canvas and inspector thumbnail", () => {
    const styleConfig = {
      variant: "border-1" as const,
      sparkle: { enabled: true, sparkles: [sparkle] },
    };

    const { container: canvas } = render(<ScreenBorderDisplay styleConfig={styleConfig} />);
    const { container: thumb } = render(
      <ScreenBorderDisplay styleConfig={styleConfig} showSparkle={false} />,
    );

    const canvasMaskIds = [
      ...canvas.querySelectorAll("mask[id]"),
    ].map((node) => node.getAttribute("id"));
    const thumbMaskIds = [
      ...thumb.querySelectorAll("mask[id]"),
    ].map((node) => node.getAttribute("id"));

    expect(canvasMaskIds).toHaveLength(1);
    expect(thumbMaskIds).toHaveLength(0);

    const { container: canvas2 } = render(
      <ScreenBorderDisplay styleConfig={styleConfig} />,
    );
    const allMaskIds = [
      ...canvas.querySelectorAll("mask[id]"),
      ...canvas2.querySelectorAll("mask[id]"),
    ].map((node) => node.getAttribute("id"));

    expect(new Set(allMaskIds).size).toBe(2);
  });

  it("keeps mask spot small so flow does not cover the whole border on mount", () => {
    const styleConfig = {
      variant: "border-1" as const,
      sparkle: { enabled: true, sparkles: [sparkle] },
    };

    const { container } = render(
      <div style={{ width: 0, height: 0 }}>
        <ScreenBorderDisplay styleConfig={styleConfig} />
      </div>,
    );

    const radius = Number(container.querySelector("circle")?.getAttribute("r"));
    expect(radius).toBeGreaterThan(0);
    expect(radius).toBeLessThanOrEqual(18);
    expect(container.querySelector("animateMotion")).not.toBeNull();
  });
});
