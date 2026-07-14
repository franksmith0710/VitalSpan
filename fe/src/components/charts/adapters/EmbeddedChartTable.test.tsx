import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmbeddedChartTable } from "./EmbeddedChartTable";

describe("EmbeddedChartTable", () => {
  it("uses table-fixed without min-width floor in dashboard embed mode", () => {
    const { container } = render(
      <EmbeddedChartTable
        columns={["id", "name"]}
        displayCols={["id", "name"]}
        rows={[[1, "a"]]}
        page={1}
        onPageChange={() => {}}
      />,
    );
    const table = container.querySelector("table");
    expect(table).toHaveClass("table-fixed");
    expect(table).toHaveClass("min-w-0");
    expect(table).not.toHaveClass("min-w-[320px]");
  });

  it("truncates cell text with title tooltip", () => {
    render(
      <EmbeddedChartTable
        columns={["channel"]}
        displayCols={["channel"]}
        rows={[["线下门店"]]}
        page={1}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByTitle("线下门店")).toHaveClass("truncate");
  });

  it("T-TABLE-UI-03: wordWrap uses break-words", () => {
    render(
      <EmbeddedChartTable
        columns={["t"]}
        displayCols={["t"]}
        rows={[["长文本"]]}
        page={1}
        onPageChange={() => {}}
        tableStyle={{ wordWrap: true }}
      />,
    );
    expect(screen.getByTitle("长文本")).toHaveClass("break-words");
  });
});
