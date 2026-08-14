import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

import { PlatformConnectPage } from "./PlatformConnectPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter>
          <PlatformConnectPage />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("PlatformConnectPage smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it("shows honest scope banner for email-only delivery", async () => {
    mockApiFetch.mockResolvedValue({
      items: [
        {
          slot: "qq",
          label: "QQ 邮箱",
          configured: false,
          source: "none",
          hasPassword: false,
        },
      ],
    });
    renderPage();
    expect(await screen.findByTestId("platform-connect-scope-hint")).toHaveTextContent(
      "目前仅支持邮件 SMTP",
    );
    expect(screen.getByTestId("platform-connect-scope-hint")).toHaveTextContent("下一迭代");
  });
});
