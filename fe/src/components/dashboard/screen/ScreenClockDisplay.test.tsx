import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScreenClockDisplay } from "./ScreenClockDisplay";

describe("ScreenClockDisplay", () => {
  afterEach(() => {
    cleanup();
  });

  it("applies configured text color to clock text nodes", () => {
    render(
      <ScreenClockDisplay
        styleConfig={{
          fontSize: 14,
          color: "#ff5500",
          showWeekday: true,
          showSeconds: true,
        }}
      />,
    );

    const time = screen.getByTestId("screen-clock-time");
    const weekday = screen.getByTestId("screen-clock-weekday");

    expect(time.style.color).toBe("rgb(255, 85, 0)");
    expect(weekday.style.color).toBe("rgb(255, 85, 0)");
  });
});
