export const CUSTOM_VIZ_PAYLOAD_CLASS = "vs-cv-payload";

export type CustomVizRuntimePayload = {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  style: Record<string, unknown>;
};

function styleToCssVars(style: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined) continue;
    const kebab = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    out[`--vs-style-${kebab}`] = String(value);
  }
  return out;
}

export function injectCustomVizPayload(host: HTMLElement, payload: CustomVizRuntimePayload): void {
  let node = host.querySelector(`.${CUSTOM_VIZ_PAYLOAD_CLASS}`);
  if (!node) {
    node = document.createElement("script");
    node.type = "application/json";
    node.className = CUSTOM_VIZ_PAYLOAD_CLASS;
    host.prepend(node);
  }
  node.textContent = JSON.stringify(payload);
  const vars = styleToCssVars(payload.style);
  for (const [name, value] of Object.entries(vars)) {
    host.style.setProperty(name, value);
  }
}
