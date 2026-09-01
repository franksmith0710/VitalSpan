export type ScanBindStart = {
  sessionId: string;
  redirectUri: string;
  state: string;
  embedKind: "dt_frame";
  clientId?: string | null;
  corpId?: string | null;
  agentId?: string | null;
};

declare global {
  interface Window {
    DTFrameLogin?: (
      frameOpts: { id: string; width: number; height: number },
      authOpts: Record<string, string>,
      callback: (result: { authCode?: string; redirectUrl?: string }) => void,
    ) => void;
  }
}

const SCRIPT_URLS = {
  dingtalk: "https://g.alicdn.com/dingding/h5-dingtalk-login/0.21.0/ddlogin.js",
} as const;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`无法加载脚本：${src}`));
    document.head.appendChild(script);
  });
}

export async function embedDingtalkQr(
  containerId: string,
  params: ScanBindStart,
  onAuthCode: (code: string) => void,
): Promise<void> {
  await loadScript(SCRIPT_URLS.dingtalk);
  if (!window.DTFrameLogin) {
    throw new Error("钉钉扫码组件未就绪");
  }
  const el = document.getElementById(containerId);
  if (el) {
    el.innerHTML = "";
  }
  window.DTFrameLogin(
    { id: containerId, width: 280, height: 280 },
    {
      redirect_uri: encodeURIComponent(params.redirectUri),
      client_id: params.clientId ?? "",
      scope: "openid",
      response_type: "code",
      state: params.state,
      prompt: "consent",
    },
    (result) => {
      if (result.authCode) {
        onAuthCode(result.authCode);
      }
    },
  );
}
