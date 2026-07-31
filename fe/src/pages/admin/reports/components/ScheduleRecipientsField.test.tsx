import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  DEFAULT_RECIPIENTS,
  hasValidRecipients,
  isValidRecipient,
  ScheduleRecipientsField,
} from "./ScheduleRecipientsField";

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({
    items: [
      { id: "u1", username: "alice" },
      { id: "u2", username: "bob" },
    ],
  }),
}));

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ScheduleRecipientsField", () => {
  it("validates email recipients", () => {
    expect(isValidRecipient({ type: "email", value: "bad" })).toBe(false);
    expect(isValidRecipient({ type: "email", value: "a@b.com" })).toBe(true);
    expect(hasValidRecipients(DEFAULT_RECIPIENTS)).toBe(true);
  });

  it("renders role/user/email controls and add button", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    wrap(
      <ScheduleRecipientsField value={DEFAULT_RECIPIENTS} onChange={onChange} idPrefix="test" />,
    );
    expect(screen.getByText("接收人")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加" }));
    expect(onChange).toHaveBeenCalled();
  });
});
