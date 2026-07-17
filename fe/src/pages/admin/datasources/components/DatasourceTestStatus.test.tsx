import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DatasourceTestStatus } from "./DatasourceTestStatus";

describe("DatasourceTestStatus", () => {
  it("shows green success state with localized message", () => {
    render(
      <DatasourceTestStatus
        error={null}
        result={{
          ok: true,
          message: "Connection successful",
          latencyMs: 39,
          traceId: "trace-1",
        }}
        layout="card"
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("连接测试成功");
    expect(screen.getByRole("status")).toHaveTextContent("数据库连接正常");
    expect(screen.getByRole("status")).not.toHaveTextContent("操作失败");
    expect(screen.getByRole("status").className).toMatch(/success/);
  });

  it("shows red failure state", () => {
    render(
      <DatasourceTestStatus
        error={null}
        result={{
          ok: false,
          message: "[TIMESCALE_EXTENSION_MISSING] timescaledb extension not installed",
          code: "TIMESCALE_EXTENSION_MISSING",
        }}
        layout="card"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("连接测试失败");
    expect(screen.getByRole("alert").className).toMatch(/error/);
  });
});
