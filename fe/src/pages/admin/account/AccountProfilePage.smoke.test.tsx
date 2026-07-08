import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountProfilePage } from "./AccountProfilePage";

const mockApiFetch = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({ refresh: mockRefresh }),
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe("AccountProfilePage smoke", () => {
  beforeEach(() => {
    mockApiFetch.mockResolvedValue({
      id: "u1",
      username: "admin",
      displayName: "Admin",
      email: "admin@vitalspan.local",
      roles: ["admin"],
    });
  });
  afterEach(() => cleanup());

  it("renders profile fields from /me", async () => {
    render(wrap(<AccountProfilePage />));
    expect(await screen.findByDisplayValue("Admin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin@vitalspan.local")).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin")).toBeDisabled();
  });
});
