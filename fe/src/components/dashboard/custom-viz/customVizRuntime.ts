import * as d3 from "d3";
import {
  CUSTOM_VIZ_PAYLOAD_CLASS,
  CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
  CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT,
  type CustomVizRuntimePayload,
} from "./customVizPayload";

export type VsCvApi = {
  protocolVersion: typeof CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION;
  getPayload: () => CustomVizRuntimePayload | null;
  onPayload: (handler: (payload: CustomVizRuntimePayload) => void) => () => void;
  d3: typeof d3;
};

export type CustomVizHostElement = HTMLElement & { vsCv?: VsCvApi };

export function getPayloadFromHost(host: HTMLElement): CustomVizRuntimePayload | null {
  const node = host.querySelector(`.${CUSTOM_VIZ_PAYLOAD_CLASS}`);
  if (!node?.textContent) return null;
  try {
    return JSON.parse(node.textContent) as CustomVizRuntimePayload;
  } catch {
    return null;
  }
}

export function attachCustomVizRuntime(host: HTMLElement): () => void {
  const bound: Array<(event: Event) => void> = [];
  const api: VsCvApi = {
    protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
    getPayload: () => getPayloadFromHost(host),
    onPayload: (handler) => {
      const listener = (event: Event) => {
        const detail = (event as CustomEvent<CustomVizRuntimePayload>).detail;
        handler(detail ?? getPayloadFromHost(host) ?? emptyUnboundPayload());
      };
      host.addEventListener(CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT, listener);
      bound.push(listener);
      return () => host.removeEventListener(CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT, listener);
    },
    d3,
  };
  (host as CustomVizHostElement).vsCv = api;
  return () => {
    for (const listener of bound) {
      host.removeEventListener(CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT, listener);
    }
    delete (host as CustomVizHostElement).vsCv;
  };
}

function emptyUnboundPayload(): CustomVizRuntimePayload {
  return {
    protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
    bindingStatus: "unbound",
    columns: [],
    rows: [],
    style: {},
  };
}
