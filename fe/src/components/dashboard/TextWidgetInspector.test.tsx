import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TextEditRail } from "./TextEditRail";
import type { LayoutWidget, TextWidgetConfig } from "./layoutUtils";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ items: [] }),
}));

const widget = {
  id: "text-1",
  type: "text",
  title: "说明",
  colSpan: 6,
  rowSpan: 2,
  order: 0,
  textConfig: { content: "<p>旧内容</p>", variant: "html" },
} satisfies LayoutWidget & { textConfig: TextWidgetConfig };

function renderRail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TextEditRail
        widget={widget}
        onTitleChange={vi.fn()}
        onConfigChange={vi.fn()}
        onDelete={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

describe("TextEditRail", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders data/style tabs without unsupported advanced slots", () => {
    renderRail();

    expect(screen.getByText("富文本")).toBeVisible();
    expect(screen.getByRole("tab", { name: "数据" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "样式" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: "高级" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("维度，拖动字段至此处")).not.toBeInTheDocument();
    expect(screen.queryByText("富文本不使用图表过滤器")).not.toBeInTheDocument();
    expect(screen.getByText(/先在右侧选择数据集/)).toBeVisible();
    expect(screen.getByText("字段")).toBeVisible();
    expect(screen.getByRole("button", { name: "选择数据集" })).toBeVisible();
  });
});
