import { render, screen } from "@testing-library/react";
import { Database } from "lucide-react";
import { describe, expect, it } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminPageHeaderIcon } from "@/components/layout/list-page-kit";
import { AdminPageShell } from "./admin-page-shell";

function renderShell(ui: React.ReactElement) {
  return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>);
}

describe("AdminPageShell", () => {
  it("hero layout: icon + stacked title/description + actions", () => {
    renderShell(
      <AdminPageShell
        layout="list"
        title="数据大屏"
        icon={
          <AdminPageHeaderIcon tone="success">
            <Database className="size-6" aria-hidden />
          </AdminPageHeaderIcon>
        }
        description="16:9 深色可视化大屏，对标 DataEase 数据大屏；复用像素画布编辑与发布。"
        actions={<button type="button">新建</button>}
      >
        <div>body</div>
      </AdminPageShell>,
    );

    expect(screen.getByRole("heading", { name: "数据大屏" })).toHaveClass("text-lg");
    expect(screen.getByText(/16:9 深色可视化大屏/)).toHaveClass("line-clamp-2");
    expect(screen.getByTestId("admin-page-header-frame")).toHaveClass("rounded-2xl");
    expect(screen.getByRole("button", { name: "新建" })).toBeInTheDocument();
  });

  it("fill toolbar layout when titleUnwrapped", () => {
    renderShell(
      <AdminPageShell
        layout="fill"
        titleUnwrapped
        title={<span>内联标题</span>}
        description="有未保存的更改 · 保存后生效"
        actions={<button type="button">返回</button>}
      >
        <div>body</div>
      </AdminPageShell>,
    );

    expect(screen.getByText("内联标题")).toBeInTheDocument();
    expect(screen.getByText("有未保存的更改 · 保存后生效")).toHaveClass("sm:max-w-md");
  });
});
