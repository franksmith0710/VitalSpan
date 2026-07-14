import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageErrorBanner } from "./page-error-banner";

describe("PageErrorBanner", () => {
  it("renders fixed overlay via portal without blocking layout flow", () => {
    render(
      <div data-testid="page-root">
        <PageErrorBanner message="测试错误" onRetry={() => undefined} />
      </div>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("测试错误");
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
    expect(screen.getByTestId("page-root").children).toHaveLength(0);
  });
});
