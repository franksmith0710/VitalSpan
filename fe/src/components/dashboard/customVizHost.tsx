import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from "react";
import type { DashboardStyleConfig } from "./dashboardStyleConfig";
import { getDashboardThemeTokens, themeTokensToScopeVars } from "./dashboardThemeTokens";

export const CUSTOM_VIZ_HOST_CLASS = "vs-custom-viz-host";

const HOST_SEL = `.${CUSTOM_VIZ_HOST_CLASS}`;

/** 把 bundle 里的 html/body/:root 收到宿主，避免污染整页看板。 */
export function rewriteBundleCss(css: string): string {
  return css.replace(/(^|})([^{}]+)\{/g, (_match, lead: string, selectors: string) => {
    const trimmed = selectors.trim();
    if (
      !trimmed ||
      trimmed.startsWith("@") ||
      trimmed.startsWith("from") ||
      trimmed.startsWith("to") ||
      /^\d/.test(trimmed)
    ) {
      return `${lead}${selectors}{`;
    }
    const next = trimmed
      .split(",")
      .map((raw) => {
        let sel = raw.trim();
        if (!sel) return sel;
        sel = sel.replace(/^:root\b/, HOST_SEL).replace(/^html\b/, HOST_SEL).replace(/^body\b/, HOST_SEL);
        if (sel.startsWith(HOST_SEL)) return sel;
        return `${HOST_SEL} ${sel}`;
      })
      .join(", ");
    return `${lead}${next}{`;
  });
}

function importStyle(styleEl: HTMLStyleElement): HTMLStyleElement {
  const clone = document.importNode(styleEl, true);
  clone.textContent = rewriteBundleCss(clone.textContent ?? "");
  return clone;
}

/** 把库里的 HTML 源码挂进主页面 Base（innerHTML 不会跑 script，需重建）。 */
export function mountCustomVizHtml(host: HTMLElement, html: string): () => void {
  host.replaceChildren();
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const fragment = document.createDocumentFragment();

  parsed.head.querySelectorAll("style").forEach((styleEl) => {
    fragment.appendChild(importStyle(styleEl));
  });

  const scripts: string[] = [];
  Array.from(parsed.body.childNodes).forEach((node) => {
    if (node.nodeName === "SCRIPT") {
      scripts.push((node as HTMLScriptElement).textContent ?? "");
      return;
    }
    if (node.nodeName === "STYLE") {
      fragment.appendChild(importStyle(node as HTMLStyleElement));
      return;
    }
    fragment.appendChild(document.importNode(node, true));
  });

  host.appendChild(fragment);
  for (const source of scripts) {
    const script = document.createElement("script");
    script.textContent = source;
    host.appendChild(script);
  }

  return () => {
    host.replaceChildren();
  };
}

export function customVizHostStyle(dashboardStyle?: DashboardStyleConfig): CSSProperties {
  const scheme = dashboardStyle?.colorScheme ?? "light";
  const vars = themeTokensToScopeVars(getDashboardThemeTokens(scheme));
  const palette = dashboardStyle?.paletteColors ?? [];
  const next: Record<string, string> = { ...vars };
  palette.forEach((color, index) => {
    next[`--vs-palette-${index}`] = color;
  });
  if (palette[0]) next["--vs-d3-accent"] = palette[0];
  return {
    ...next,
    height: "100%",
    minHeight: 64,
    overflow: "hidden",
    color: vars["--dashboard-text-primary"],
    background: vars["--dashboard-widget-surface"],
  } as CSSProperties;
}

type HostErrorBoundaryProps = { children: ReactNode };

type HostErrorBoundaryState = { message: string | null };

export class CustomVizHostErrorBoundary extends Component<
  HostErrorBoundaryProps,
  HostErrorBoundaryState
> {
  state: HostErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: Error): HostErrorBoundaryState {
    return { message: error.message || "自定义组件渲染失败" };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    void error;
  }

  render(): ReactNode {
    if (this.state.message) {
      return (
        <div className="flex h-full min-h-[64px] items-center justify-center px-3 text-center text-theme-xs text-gray-500 dark:text-gray-400">
          {this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}
