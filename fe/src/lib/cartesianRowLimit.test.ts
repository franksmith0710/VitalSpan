import { describe, expect, it } from "vitest";
import {
  isCartesianRowCountExceeded,
  resolveCartesianRowLimit,
} from "@/lib/cartesianRowLimit";

describe("cartesianRowLimit", () => {
  it("defaults to CHART_EXECUTE_LIMIT when queryLimit omitted", () => {
    expect(resolveCartesianRowLimit()).toBe(100);
  });

  it("uses queryLimit when provided", () => {
    expect(resolveCartesianRowLimit(1000)).toBe(1000);
  });

  it("does not reject line chart within queryLimit", () => {
    expect(isCartesianRowCountExceeded("line", 150, 1000)).toBe(false);
  });

  it("rejects line chart above default limit", () => {
    expect(isCartesianRowCountExceeded("line", 150)).toBe(true);
  });

  it("ignores non-cartesian chart types", () => {
    expect(isCartesianRowCountExceeded("pie", 500)).toBe(false);
  });
});
