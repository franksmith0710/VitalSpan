/** Radix Select/Popover 经 Portal 挂到 Dialog 外；须阻止 outside 事件误关弹层 */

export function isDialogNestedPortaledLayer(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('[data-slot="select-content"]') ||
      target.closest("[data-radix-select-content]") ||
      target.closest('[role="listbox"]') ||
      target.closest('[role="menu"]') ||
      target.closest("[data-radix-menu-content]") ||
      target.closest("[data-radix-popper-content-wrapper]"),
  );
}

export function isAnySelectDropdownOpen(): boolean {
  return Boolean(
    document.querySelector('[data-slot="select-content"][data-state="open"]') ||
      document.querySelector('[role="listbox"][data-state="open"]') ||
      document.querySelector('[role="menu"][data-state="open"]'),
  );
}

export function isDialogDismissBlocked(event: Event): boolean {
  if (isAnySelectDropdownOpen()) return true;
  return isDialogNestedPortaledLayer(event.target);
}

export function guardDialogDismiss(event: Event): void {
  if (isDialogDismissBlocked(event)) {
    event.preventDefault();
  }
}
