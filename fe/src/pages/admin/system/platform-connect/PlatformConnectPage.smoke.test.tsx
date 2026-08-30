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
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockImplementation((path: string) => {
      if (path.includes("/im/slots")) {
        return Promise.resolve({
          items: [
            { channel: "wecom", label: "企业微信", configured: false, source: "none", hasSecret: false, deliveryMode: "corporate_app" },
            { channel: "dingtalk", label: "钉钉", configured: false, source: "none", hasSecret: false, deliveryMode: "corporate_app" },
            { channel: "feishu", label: "飞书", configured: false, source: "none", hasSecret: false, deliveryMode: "corporate_app" },
          ],
        });
      }
      return Promise.resolve({
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
    });
  });
  afterEach(() => cleanup());

  it("shows scope banner for email and IM work notice", async () => {
    renderPage();
    const hint = await screen.findByTestId("platform-connect-scope-hint");
    expect(hint).toHaveTextContent("邮件 SMTP");
    expect(hint).toHaveTextContent("工作通知");
    expect(hint).toHaveTextContent("个人中心");
  });

  it("renders email and IM channel pickers in one row", async () => {
    renderPage();
    expect(await screen.findByText("投递通道")).toBeInTheDocument();
    expect(screen.getByText("QQ 邮箱")).toBeInTheDocument();
    expect(screen.getByText("企业微信")).toBeInTheDocument();
    expect(screen.getByText("飞书")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "工作通知" })).not.toBeInTheDocument();
  });
});
