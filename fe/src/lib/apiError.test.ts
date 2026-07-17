import { describe, expect, it } from "vitest";
import { ApiRequestError } from "@/lib/api";
import { localizeApiMessage, mapApiError } from "./apiError";

describe("mapApiError", () => {
  it("maps DATASOURCE_NOT_FOUND by code", () => {
    const err = new ApiRequestError("Data source not found", "DATASOURCE_NOT_FOUND");
    expect(mapApiError(err)).toBe("数据源不存在");
  });

  it("maps English message by exact match", () => {
    expect(localizeApiMessage("Data source not found")).toBe("数据源不存在");
  });

  it("maps connection test success message", () => {
    expect(localizeApiMessage("Connection successful")).toBe("数据库连接正常");
  });

  it("maps QUERY_TIMEOUT from Error with code property", () => {
    const err = Object.assign(new Error("Query timed out"), { code: "QUERY_TIMEOUT" });
    expect(mapApiError(err)).toBe("查询超时，请缩小数据范围");
  });

  it("maps VALIDATION_ERROR with field hint", () => {
    const err = new ApiRequestError("body.layoutJson.canvas.height: ge", "VALIDATION_ERROR", [
      { field: "body.layoutJson.canvas.height", message: "Input should be greater than or equal to 900" },
    ]);
    expect(mapApiError(err)).toContain("布局校验失败");
  });

  it("falls back to generic message for unknown English", () => {
    expect(mapApiError(new Error("Something went wrong"))).toBe("操作失败，请稍后重试");
  });

  it("preserves Chinese messages", () => {
    expect(mapApiError(new Error("查询失败"))).toBe("查询失败");
  });
});
