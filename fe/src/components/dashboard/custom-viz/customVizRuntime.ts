import * as d3 from "d3";
import {
  measureCustomVizHost,
  thinCategoryTickIndices,
} from "./customVizLayoutHelpers";
import {
  CUSTOM_VIZ_LAYOUT_UPDATE_EVENT,
  CUSTOM_VIZ_PAYLOAD_CLASS,
  CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
  CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT,
  type CustomVizRuntimeLayout,
  type CustomVizRuntimePayload,
} from "./customVizPayload";

export type VsCvHelpers = {
  thinCategoryTickIndices: typeof thinCategoryTickIndices;
  measureHost: (target?: Element | null) => CustomVizRuntimeLayout;
};

export type VsCvApi = {
  protocolVersion: typeof CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION;
  getPayload: () => CustomVizRuntimePayload | null;
  onPayload: (handler: (payload: CustomVizRuntimePayload) => void) => () => void;
  onLayout: (handler: (layout: CustomVizRuntimeLayout) => void) => () => void;
  helpers: VsCvHelpers;
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
  const bound: Array<{ type: "payload" | "layout"; listener: (event: Event) => void }> = [];
  const helpers: VsCvHelpers = {
    thinCategoryTickIndices,
    measureHost: (target) => {
      const el = (target ?? host) as HTMLElement;
      return measureCustomVizHost(el);
    },
  };

  const api: VsCvApi = {
    protocolVersion: CUSTOM_VIZ_PAYLOAD_PROTOCOL_VERSION,
    getPayload: () => getPayloadFromHost(host),
    onPayload: (handler) => {
      const listener = (event: Event) => {
        const detail = (event as CustomEvent<CustomVizRuntimePayload>).detail;
        handler(detail ?? getPayloadFromHost(host) ?? emptyUnboundPayload());
      };
      host.addEventListener(CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT, listener);
      bound.push({ type: "payload", listener });
      return () => host.removeEventListener(CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT, listener);
    },
    onLayout: (handler) => {
      const listener = (event: Event) => {
        const detail = (event as CustomEvent<CustomVizRuntimeLayout>).detail;
        const layout = detail ?? getPayloadFromHost(host)?.layout;
        if (layout) handler(layout);
      };
      host.addEventListener(CUSTOM_VIZ_LAYOUT_UPDATE_EVENT, listener);
      bound.push({ type: "layout", listener });
      return () => host.removeEventListener(CUSTOM_VIZ_LAYOUT_UPDATE_EVENT, listener);
    },
    helpers,
    d3,
  };
  (host as CustomVizHostElement).vsCv = api;
  return () => {
    for (const { type, listener } of bound) {
      host.removeEventListener(
        type === "payload" ? CUSTOM_VIZ_PAYLOAD_UPDATE_EVENT : CUSTOM_VIZ_LAYOUT_UPDATE_EVENT,
        listener,
      );
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
