import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockApiFetch = vi.fn();
vi.mock("@/lib/api", () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
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

import { OrgTreePage } from "./OrgTreePage";

const ORG_A = "00000000-0000-4000-8000-000000000030";

function renderOrgs() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={0}>
        <MemoryRouter initialEntries={["/admin/system/orgs"]}>
          <Routes>
            <Route path="/admin/system/orgs" element={<OrgTreePage />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("OrgTreePage smoke", () => {
  beforeEach(() => mockApiFetch.mockReset());
  afterEach(() => cleanup());

  it("renders org tree", async () => {
    mockApiFetch.mockResolvedValue({
      items: [{ id: ORG_A, parent_id: null, name: "总部", path: "/hq", level: 0 }],
    });
    renderOrgs();
    expect(await screen.findByText("总部")).toBeInTheDocument();
  });

  it("edit org triggers PUT", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === `/api/v1/orgs/${ORG_A}` && init?.method === "PUT") {
        return { id: ORG_A, parent_id: null, name: "总部（改）", path: "/hq", level: 0 };
      }
      if (path === "/api/v1/orgs") {
        return { items: [{ id: ORG_A, parent_id: null, name: "总部", path: "/hq", level: 0 }] };
      }
      return {};
    });
    renderOrgs();
    await userEvent.click(await screen.findByRole("button", { name: "编辑 总部" }));
    const input = screen.getByLabelText("名称");
    await userEvent.clear(input);
    await userEvent.type(input, "总部（改）");
    await userEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => {
      const putCall = mockApiFetch.mock.calls.find(
        (c) => c[0] === `/api/v1/orgs/${ORG_A}` && (c[1] as RequestInit)?.method === "PUT",
      );
      expect(putCall).toBeTruthy();
      const body = JSON.parse(String((putCall![1] as RequestInit).body));
      expect(body.name).toBe("总部（改）");
    });
  });

  it("delete org triggers DELETE", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === `/api/v1/orgs/${ORG_A}` && init?.method === "DELETE") return {};
      if (path === "/api/v1/orgs") {
        return { items: [{ id: ORG_A, parent_id: null, name: "总部", path: "/hq", level: 0 }] };
      }
      return {};
    });
    renderOrgs();
    await userEvent.click(await screen.findByRole("button", { name: "删除 总部" }));
    await userEvent.click(await screen.findByRole("button", { name: "确认删除" }));
    await waitFor(() => {
      const delCall = mockApiFetch.mock.calls.find(
        (c) => c[0] === `/api/v1/orgs/${ORG_A}` && (c[1] as RequestInit)?.method === "DELETE",
      );
      expect(delCall).toBeTruthy();
    });
  });

  it("create org triggers POST", async () => {
    mockApiFetch.mockImplementation(async (...args: unknown[]) => {
      const path = String(args[0] ?? "");
      const init = args[1] as RequestInit | undefined;
      if (path === "/api/v1/orgs" && init?.method === "POST") {
        return { id: "org-new", parent_id: null, name: "华东区", path: "/east", level: 0 };
      }
      if (path === "/api/v1/orgs") {
        return { items: [] };
      }
      return {};
    });
    renderOrgs();
    await userEvent.click(await screen.findByRole("button", { name: "新建组织" }));
    await userEvent.type(screen.getByLabelText("名称"), "华东区");
    await userEvent.click(screen.getByRole("button", { name: "创建" }));
    await waitFor(() => {
      const postCall = mockApiFetch.mock.calls.find(
        (c) => c[0] === "/api/v1/orgs" && (c[1] as RequestInit)?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const body = JSON.parse(String((postCall![1] as RequestInit).body));
      expect(body.name).toBe("华东区");
      expect(body.parent_id).toBeNull();
    });
  });
});
