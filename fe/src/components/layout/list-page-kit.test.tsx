import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListPageTableFrame } from "@/components/layout/list-page-kit";

describe("ListPageTableFrame", () => {
  it("allows vertical scrolling inside fill-layout list pages", () => {
    render(
      <ListPageTableFrame>
        <p>列表内容</p>
      </ListPageTableFrame>,
    );

    const frame = screen.getByText("列表内容").parentElement;
    expect(frame?.className).toContain("overflow-y-auto");
    expect(frame?.className).not.toContain("overflow-hidden");
  });
});
