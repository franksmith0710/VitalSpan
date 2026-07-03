import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "./routes";

describe("AppRoutes smoke", () => {
  it("renders AdminLayout at /admin with VitalSpan logo (T-FE-01)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("VitalSpan").length).toBeGreaterThanOrEqual(1);
  });

  it("redirects / to admin shell (T-FE-02)", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("VitalSpan").length).toBeGreaterThanOrEqual(1);
  });
});
