import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportExportCard } from "./ReportExportCard";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("ReportExportCard smoke", () => {
  afterEach(() => cleanup());

  it("polls export and shows download link", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce({ exportId: "ex-1", status: "pending", downloadUrl: null })
      .mockResolvedValueOnce({ exportId: "ex-1", status: "succeeded", downloadUrl: "/api/v1/reports/export/ex-1/file" });

    render(wrap(<ReportExportCard defaultTemplateId="tpl-1" />));
    await user.click(screen.getByRole("button", { name: "发起导出" }));

    await waitFor(() => expect(screen.getByRole("link", { name: /下载/ })).toBeInTheDocument());
    expect(screen.getByText(/状态：/)).toBeInTheDocument();
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/reports/export?templateId=tpl-1"),
    );
  });
});
