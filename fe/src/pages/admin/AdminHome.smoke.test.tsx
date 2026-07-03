import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { AdminHomePage } from "./AdminHomePage";

describe("AdminHomePage smoke", () => {
  it("renders shell preview card with form controls (T-FE-13)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminHomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "壳层预览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "主操作示例" })).toBeInTheDocument();
    expect(screen.getByLabelText("示例输入")).toBeInTheDocument();
  });

  it("shows welcome copy for M1 shell (T-FE-14)", () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <AdminHomePage />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/M1 管理端壳层已就绪/).length).toBeGreaterThanOrEqual(1);
  });
});
