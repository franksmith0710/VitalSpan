import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserViewsSection } from "./components/UserViewsSection";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("UserViewsSection smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockResolvedValue({ items: [] });
  });
  afterEach(() => cleanup());

  it("renders empty state", async () => {
    render(wrap(<UserViewsSection />));
    expect(
      await screen.findByText("尚未配置个人默认视图，将使用角色默认"),
    ).toBeInTheDocument();
  });
});
