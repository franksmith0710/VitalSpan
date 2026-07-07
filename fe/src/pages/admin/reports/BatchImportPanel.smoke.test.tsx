import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BatchImportPanel } from "./components/BatchImportPanel";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("BatchImportPanel smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockResolvedValue({
      batchId: "b1",
      createdNodeIds: ["n1"],
      rolledBackCount: 0,
      failures: [],
    });
  });
  afterEach(() => cleanup());

  it("shows parse error for invalid json", async () => {
    const user = userEvent.setup();
    render(wrap(<BatchImportPanel readOnly={false} />));
    const input = screen.getByLabelText("选择批量导入 JSON 文件");
    const file = new File(["not-json"], "bad.json", { type: "application/json" });
    await user.upload(input, file);
    expect(await screen.findByText(/无法解析 JSON/)).toBeInTheDocument();
  });
});
