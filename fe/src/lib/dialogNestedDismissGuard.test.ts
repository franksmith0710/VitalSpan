import { describe, expect, it } from "vitest";
import {
  guardDialogDismiss,
  isAnySelectDropdownOpen,
  isDialogNestedPortaledLayer,
} from "./dialogNestedDismissGuard";

describe("dialogNestedDismissGuard", () => {
  it("detects portaled select content as nested layer", () => {
    const host = document.createElement("div");
    host.setAttribute("data-slot", "select-content");
    const item = document.createElement("div");
    host.appendChild(item);
    document.body.appendChild(host);
    expect(isDialogNestedPortaledLayer(item)).toBe(true);
    host.remove();
  });

  it("blocks dismiss while select dropdown is open", () => {
    const host = document.createElement("div");
    host.setAttribute("data-slot", "select-content");
    host.setAttribute("data-state", "open");
    document.body.appendChild(host);
    expect(isAnySelectDropdownOpen()).toBe(true);
    const event = new Event("pointerdown", { cancelable: true });
    guardDialogDismiss(event);
    expect(event.defaultPrevented).toBe(true);
    host.remove();
  });
});
