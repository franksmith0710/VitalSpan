import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useListPagination } from "./list-pagination";

describe("useListPagination", () => {
  it("computes offset from page and pageSize", () => {
    const { result } = renderHook(() => useListPagination(20));
    expect(result.current.offset).toBe(0);

    act(() => result.current.onPageChange(2));
    expect(result.current.page).toBe(2);
    expect(result.current.offset).toBe(20);
  });

  it("resets to page 1 when reset deps change", () => {
    const { result, rerender } = renderHook(
      ({ filter }: { filter: string }) => useListPagination(20, [filter]),
      { initialProps: { filter: "a" } },
    );

    act(() => result.current.onPageChange(3));
    expect(result.current.page).toBe(3);

    rerender({ filter: "b" });
    expect(result.current.page).toBe(1);
  });
});
