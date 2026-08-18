export const CUSTOM_VIZ_PAYLOAD_CLASS = "vs-cv-payload";
export const CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT = "vs-cv-payload-update";
export const CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION = 1 as const;

export type CustomVizBindingStatus = "unbound" | "bound" | "empty" | "error";

export type CustomVizRuntimePayload = {
  protocolVersion: typeof CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION;
  bindingStatus: CustomVizBindingStatus;
  columns: string[];
  rows: (string | number | boolean | null)[][];
  style: Record<string, unknown>;
  error?: string;
};

export function resolveCustomVizBindingStatus(args: {
  executeReady: boolean;
  loading: boolean;
  error: string | null;
  rows: (string | number | boolean | null)[][];
}): CustomVizBindingStatus {
  if (!args.executeReady) return "unbound";
  if (args.error) return "error";
  if (args.loading && args.rows.length === 0) return "unbound";
  if (args.rows.length === 0) return "empty";
  return "bound";
}

export function buildCustomVizRuntimePayload(args: {
  executeReady: boolean;
  loading: boolean;
  error: string | null;
  columns: string[];
  rows: (string | number | boolean | null)[][];
  style: Record<string, unknown>;
}): CustomVizRuntimePayload {
  const bindingStatus = resolveCustomVizBindingStatus(args);
  const payload: CustomVizRuntimePayload = {
    protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
    bindingStatus,
    columns: args.columns,
    rows: args.rows,
    style: args.style,
  };
  if (bindingStatus === "error" && args.error) {
    payload.error = args.error;
  }
  return payload;
}

function styleToCssVars(style: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(style)) {
    if (value === null || value === undefined) continue;
    const kebab = key.replace(/([A-Z])/g, "-$1").toLowerCase();
    out[`--vs-style-${kebab}`] = String(value);
  }
  return out;
}

function payloadSignature(payload: CustomVizRuntimePayload): string {
  return JSON.stringify(payload);
}

export function injectCustomVizPayload(host: HTMLElement, payload: CustomVizRuntimePayload): void {
  const signature = payloadSignature(payload);
  if (host.dataset.vsCvPayloadSig === signature) return;

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
  host.dataset.vsCvPayloadSig = signature;
  host.dispatchEvent(
    new CustomEvent(CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT, {
      detail: payload,
      bubbles: false,
    }),
  );
}
