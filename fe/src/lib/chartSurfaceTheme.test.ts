import { describe, expect, it } from "vitest";
import {
  resolveEffectiveChartScheme,
  resolveTableThemeVars,
} from "./chartSurfaceTheme";

describe("chartSurfaceTheme", () => {
  it("T-TABLE-THEME-01: light widget shell overrides dark dashboard scheme", () => {
    expect(resolveEffectiveChartScheme("dark", "#93c5fd")).toBe("light");
    expect(resolveEffectiveChartScheme("dark", "#1e293b")).toBe("dark");
  });

  it("T-TABLE-THEME-02: resolveTableThemeVars prefers explicit colors", () => {
    const vars = resolveTableThemeVars(
      { headerBg: "#eef2ff", headerFg: "#312e81", bodyFg: "#1e3a8a" },
      { colorScheme: "dark", widgetShellBg: "#93c5fd" },
    );
    expect(vars["--dashboard-table-header-bg"]).toBe("#eef2ff");
    expect(vars["--dashboard-table-header-fg"]).toBe("#312e81");
    expect(vars["--dashboard-table-body-fg"]).toBe("#1e3a8a");
  });

  it("T-TABLE-THEME-03: uses DE white translucent scroll tokens", () => {
    const vars = resolveTableThemeVars({}, { colorScheme: "dark", widgetShellBg: "#bfdbfe" });
    expect(vars["--dashboard-scroll-thumb"]).toBe("rgb(255 255 255 / 0.35)");
    expect(vars["--dashboard-scroll-track"]).toBe("transparent");
  });
});
