import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmbeddedChartTable } from "./EmbeddedChartTable";

describe("EmbeddedChartTable", () => {
  it("uses table-auto in dashboard embed mode by default", () => {
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
    expect(table).toHaveClass("table-auto");
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

  it("applies opacity, border and scrollbar theme variables", () => {
    const { container } = render(
      <EmbeddedChartTable
        columns={["a"]}
        displayCols={["a"]}
        rows={[[1]]}
        page={1}
        onPageChange={() => {}}
        tableStyle={{
          opacity: 80,
          borderColor: "#ff0000",
          scrollbarColor: "#00ff00",
        }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveStyle({ opacity: "0.8", border: "1px solid rgb(255, 0, 0)" });
    const scroll = container.querySelector(".dashboard-scroll") as HTMLElement;
    expect(scroll.style.getPropertyValue("--dashboard-scroll-thumb")).toBe("#00ff00");
  });

  it("scroll mode renders all rows without pagination", () => {
    const { container } = render(
      <EmbeddedChartTable
        columns={["id"]}
        displayCols={["id"]}
        rows={[[1], [2], [3]]}
        page={1}
        onPageChange={() => {}}
        tableStyle={{ paginationMode: "scroll", pageSize: 2 }}
      />,
    );
    expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(screen.queryByLabelText("上一页")).not.toBeInTheDocument();
  });

  it("page mode uses compact pagination variant", () => {
    render(
      <EmbeddedChartTable
        columns={["id"]}
        displayCols={["id"]}
        rows={[[1], [2], [3]]}
        page={1}
        onPageChange={() => {}}
        tableStyle={{ paginationMode: "page", pageSize: 2, paginationVariant: "compact" }}
      />,
    );
    expect(screen.getByLabelText("上一页")).toBeInTheDocument();
    expect(screen.getByText("1/2 · 2条/页")).toBeInTheDocument();
  });

  it("auto column mode uses table-auto without colgroup", () => {
    const { container } = render(
      <EmbeddedChartTable
        columns={["a", "b"]}
        displayCols={["a", "b"]}
        rows={[[1, 2]]}
        page={1}
        onPageChange={() => {}}
        tableStyle={{ columnWidthMode: "auto" }}
      />,
    );
    const table = container.querySelector("table");
    expect(table).toHaveClass("table-auto");
    expect(container.querySelector("colgroup")).toBeNull();
  });

  it("fixed column mode uses equal col widths", () => {
    const { container } = render(
      <EmbeddedChartTable
        columns={["a", "b"]}
        displayCols={["a", "b"]}
        rows={[[1, 2]]}
        page={1}
        onPageChange={() => {}}
        tableStyle={{ columnWidthMode: "fixed" }}
      />,
    );
    const cols = container.querySelectorAll("col");
    expect(cols).toHaveLength(2);
    expect(cols[0]).toHaveStyle({ width: "50%" });
  });

  it("custom column mode applies configured widths", () => {
    const { container } = render(
      <EmbeddedChartTable
        columns={["a", "b"]}
        displayCols={["a", "b"]}
        rows={[[1, 2]]}
        page={1}
        onPageChange={() => {}}
        tableStyle={{
          columnWidthMode: "custom",
          columnWidths: { a: 30, b: 70 },
        }}
      />,
    );
    const cols = container.querySelectorAll("col");
    expect(cols[0]).toHaveStyle({ width: "30%" });
    expect(cols[1]).toHaveStyle({ width: "70%" });
  });

  it("row hover can be disabled", () => {
    const { container } = render(
      <EmbeddedChartTable
        columns={["a"]}
        displayCols={["a"]}
        rows={[[1]]}
        page={1}
        onPageChange={() => {}}
        tableStyle={{ rowHover: false }}
      />,
    );
    expect(container.querySelector("tbody tr")).not.toHaveClass("hover:bg-black/[0.03]");
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
