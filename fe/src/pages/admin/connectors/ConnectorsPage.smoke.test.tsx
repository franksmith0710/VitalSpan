import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectorsPage } from "./ConnectorsPage";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: (...args: unknown[]) => mockApiFetch(...args) };
});
vi.mock("@/context/auth-context", () => ({
  useAuth: () => ({
    user: { id: "1", username: "admin", roles: ["admin"] },
    isLoading: false,
    isAuthenticated: true,
    logout: vi.fn(),
    refresh: vi.fn(async () => {}),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const MOCK_MULTI_GROUP = {
  items: [
    { type: "mysql", displayName: "MySQL", category: "relational", capabilities: ["sql"], displayGroup: "oltp", categoryLabel: "关系型数据库" },
    { type: "postgresql", displayName: "PostgreSQL", category: "relational", capabilities: ["sql"], displayGroup: "oltp", categoryLabel: "关系型数据库" },
    { type: "starrocks", displayName: "StarRocks", category: "olap", capabilities: ["sql"], displayGroup: "olap", categoryLabel: "OLAP" },
  ],
};

const MOCK_FILE_ONLY = {
  items: [
    { type: "excel", displayName: "Excel", category: "file", capabilities: ["file"], displayGroup: "file", categoryLabel: "文件" },
  ],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ConnectorsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ConnectorsPage taxonomy smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it("FB-2-01/02: renders oltp and olap tabs with categoryLabel", async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_MULTI_GROUP);
    renderPage();
    await waitFor(() => expect(screen.getByRole("tab", { name: /关系型数据库/ })).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /OLAP/ })).toBeInTheDocument();
    expect(screen.getByText("MySQL")).toBeInTheDocument();
  });

  it("FB-2-03: tab switch shows olap types", async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_MULTI_GROUP);
    renderPage();
    const user = userEvent.setup();
    await waitFor(() => screen.getByRole("tab", { name: /OLAP/ }));
    await user.click(screen.getByRole("tab", { name: /OLAP/ }));
    expect(await screen.findByText("StarRocks")).toBeInTheDocument();
  });

  it("FB-2-04: single group hides other tabs", async () => {
    mockApiFetch.mockResolvedValueOnce(MOCK_FILE_ONLY);
    renderPage();
    await waitFor(() => expect(screen.getByText("Excel")).toBeInTheDocument());
    expect(screen.queryByRole("tab", { name: /OLAP/ })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /文件/ })).toBeInTheDocument();
  });
});
