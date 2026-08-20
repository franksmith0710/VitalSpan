export const CUSTOM_VIZ_STYLE_BRIDGE_CLASS = "vs-cv-style-bridge";

const HOST_CLASS = "vs-custom-viz-host";

function styleKeyToDataAttr(key: string): string {
  return `data-vs-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
}

/**
 * Best-effort CSS bridge for bundles that hardcode colors/sizes instead of
 * reading payload.style / --vs-style-* (common in external AI artifacts).
 * Vars are set on the host by injectCustomVizPayload + customVizHostStyle.
 */
export const CUSTOM_VIZ_STYLE_BRIDGE_CSS = `
.${HOST_CLASS} .fill,
.${HOST_CLASS} .bar,
.${HOST_CLASS} .bar-fill,
.${HOST_CLASS} .progress,
.${HOST_CLASS} .progress-bar,
.${HOST_CLASS} [class*="bar-fill"],
.${HOST_CLASS} [class*="rank-bar"] {
  background: var(--vs-palette-0, var(--vs-style-accent-color, var(--vs-d3-accent, #3b82f6))) !important;
  opacity: calc(var(--vs-style-fill-opacity, 100) / 100);
  border-radius: calc(var(--vs-style-corner-radius, 4) * 1px);
}
.${HOST_CLASS} .track,
.${HOST_CLASS} .bar-track,
.${HOST_CLASS} .bar-bg,
.${HOST_CLASS} .bar,
.${HOST_CLASS} [class*="bar-track"] {
  height: var(--vs-style-bar-height, inherit);
}
.${HOST_CLASS} .row,
.${HOST_CLASS} [class*="rank-row"],
.${HOST_CLASS} [class*="list-row"] {
  gap: var(--vs-style-gap, inherit);
  margin-bottom: var(--vs-style-gap, inherit);
}
.${HOST_CLASS} .lbl,
.${HOST_CLASS} .label,
.${HOST_CLASS} .name,
.${HOST_CLASS} [class*="rank-label"] {
  color: var(--vs-style-label-color, var(--dashboard-text-primary, inherit)) !important;
  font-size: calc(var(--vs-style-font-size, var(--vs-style-label-font-size, 12)) * 1px);
}
.${HOST_CLASS} .val,
.${HOST_CLASS} .value,
.${HOST_CLASS} .num,
.${HOST_CLASS} [class*="rank-value"] {
  color: var(--vs-style-label-color, var(--dashboard-text-muted, inherit));
  font-size: calc(var(--vs-style-font-size, 12) * 1px);
}
.${HOST_CLASS} .badge,
.${HOST_CLASS} [class*="rank-badge"],
.${HOST_CLASS} [class*="rank-num"] {
  font-size: calc(var(--vs-style-font-size, 14) * 1px);
}
.${HOST_CLASS} .card .val {
  color: var(--vs-palette-0, var(--vs-style-accent-color, var(--vs-d3-accent, #38bdf8))) !important;
}
.${HOST_CLASS}[data-vs-show-rank-badge="false"] .badge,
.${HOST_CLASS}[data-vs-show-rank-badge="false"] [class*="rank-badge"],
.${HOST_CLASS}[data-vs-show-rank-badge="false"] [class*="rank-num"] {
  display: none !important;
}
.${HOST_CLASS}[data-vs-show-value="false"] .val,
.${HOST_CLASS}[data-vs-show-value="false"] .value,
.${HOST_CLASS}[data-vs-show-value="false"] [class*="rank-value"] {
  display: none !important;
}
.${HOST_CLASS}[data-vs-label-show="false"] .lbl,
.${HOST_CLASS}[data-vs-label-show="false"] .label,
.${HOST_CLASS}[data-vs-label-show="false"] .name,
.${HOST_CLASS}[data-vs-label-show="false"] [class*="rank-label"] {
  display: none !important;
}
`.trim();

export function appendCustomVizStyleBridge(host: HTMLElement): void {
  if (host.querySelector(`.${CUSTOM_VIZ_STYLE_BRIDGE_CLASS}`)) return;
  const style = document.createElement("style");
  style.className = CUSTOM_VIZ_STYLE_BRIDGE_CLASS;
  style.textContent = CUSTOM_VIZ_STYLE_BRIDGE_CSS;
  host.appendChild(style);
}

/** Mirror payload.style onto host data-* hooks for generic CSS bridge rules. */
export function applyCustomVizStyleBridgeAttributes(
  host: HTMLElement,
  style: Record<string, unknown> | undefined,
): void {
  if (!style) return;
  for (const [key, value] of Object.entries(style)) {
    const attr = styleKeyToDataAttr(key);
    if (value === null || value === undefined) {
      host.removeAttribute(attr);
      continue;
    }
    host.setAttribute(attr, String(value));
  }
}

/** Post-render DOM tweaks for common schema keys external bundles often skip in JS. */
export function applyCustomVizStyleBridgeDom(
  host: HTMLElement,
  style: Record<string, unknown> | undefined,
): void {
  applyCustomVizStyleBridgeAttributes(host, style);
  if (!style) return;

  const hideWhenFalse = [
    { key: "showRankBadge", selector: ".badge,[class*='rank-badge'],[class*='rank-num']" },
    { key: "showValue", selector: ".val,.value,[class*='rank-value']" },
    { key: "labelShow", selector: ".lbl,.label,.name,[class*='rank-label']" },
  ] as const;

  for (const { key, selector } of hideWhenFalse) {
    const flag = style[key];
    if (flag === false) {
      host.querySelectorAll(selector).forEach((node) => {
        (node as HTMLElement).style.display = "none";
      });
    } else if (flag === true) {
      host.querySelectorAll(selector).forEach((node) => {
        (node as HTMLElement).style.removeProperty("display");
      });
    }
  }
}
