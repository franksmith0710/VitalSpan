export function showBootstrapFatal(root: HTMLElement, message: string): void {
  root.innerHTML = `
    <div role="alert" style="display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;background:#f9fafb;color:#344054;">
      <div style="max-width:420px;text-align:center;">
        <p style="font-weight:600;margin:0 0 8px;">应用加载失败</p>
        <p style="font-size:14px;margin:0 0 16px;color:#667085;">${message}</p>
        <button type="button" onclick="location.reload()" style="padding:8px 16px;border:1px solid #d0d5dd;border-radius:8px;background:#fff;cursor:pointer;">刷新页面</button>
      </div>
    </div>
  `;
}
