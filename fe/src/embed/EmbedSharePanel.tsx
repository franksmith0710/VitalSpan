import { useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ORIGIN_RE = /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?$/;

export function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (!allowed.length) return true;
  if (!ORIGIN_RE.test(origin)) return false;
  return allowed.includes(origin);
}

export function EmbedSharePanel() {
  const [chartId, setChartId] = useState("");
  const [originInput, setOriginInput] = useState("");
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([]);
  const [originError, setOriginError] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const addOrigin = () => {
    setOriginError(null);
    const trimmed = originInput.trim();
    if (!trimmed) return;
    if (!ORIGIN_RE.test(trimmed)) {
      setOriginError("来源 URL 格式无效，请使用 https://example.com 格式");
      return;
    }
    if (!allowedOrigins.includes(trimmed)) {
      setAllowedOrigins((prev) => [...prev, trimmed]);
    }
    setOriginInput("");
  };

  const validateAndGenerate = async () => {
    setAlertError(null);
    setEmbedUrl(null);
    if (!chartId.trim()) {
      setAlertError("请填写图表 ID");
      return;
    }
    try {
      await apiFetch("/api/v1/charts/embed/validate", {
        method: "POST",
        body: JSON.stringify({
          chartId: chartId.trim(),
          allowedOrigins,
        }),
      });
      const params = new URLSearchParams();
      if (allowedOrigins.length) {
        params.set("allowedOrigins", allowedOrigins.join(","));
      }
      const qs = params.toString();
      const url = `${window.location.origin}/embed/chart/${chartId.trim()}${qs ? `?${qs}` : ""}`;
      setEmbedUrl(url);
    } catch (e) {
      const err = e as Error & { code?: string; fields?: Array<{ message: string }> };
      if (err.fields?.length) {
        setAlertError(err.fields.map((f) => f.message).join("；"));
      } else {
        setAlertError(err.message || "嵌入配置校验失败");
      }
    }
  };

  const iframeSrc = useMemo(() => embedUrl, [embedUrl]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-theme-xl font-semibold text-gray-800 dark:text-white/90">嵌入分享</h1>
      <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div>
          <Label htmlFor="chart-id">图表 ID</Label>
          <Input
            id="chart-id"
            className="mt-1"
            value={chartId}
            onChange={(e) => setChartId(e.target.value)}
            placeholder="00000000-0000-4000-8000-000000000001"
          />
        </div>
        <div>
          <Label htmlFor="origin-input">来源 Origin</Label>
          <div className="mt-1 flex gap-2">
            <Input
              id="origin-input"
              value={originInput}
              onChange={(e) => setOriginInput(e.target.value)}
              placeholder="https://example.com"
              fieldState={originError ? "error" : "default"}
            />
            <Button type="button" variant="outline" onClick={addOrigin}>
              添加
            </Button>
          </div>
          {originError ? <p className="mt-1 text-theme-sm text-error-600">{originError}</p> : null}
        </div>
        {allowedOrigins.length ? (
          <div className="flex flex-wrap gap-2">
            {allowedOrigins.map((o) => (
              <Badge
                key={o}
                variant="surface"
                color="primary"
                title={o}
                className="max-w-full truncate"
              >
                {o}
              </Badge>
            ))}
          </div>
        ) : null}
        {alertError ? (
          <div role="alert" className="text-theme-sm text-error-600">
            {alertError}
          </div>
        ) : null}
        <Button type="button" variant="default" onClick={validateAndGenerate}>
          校验并生成嵌入链接
        </Button>
        {embedUrl ? (
          <p className="truncate text-theme-sm text-gray-600" title={embedUrl}>
            {embedUrl}
          </p>
        ) : null}
      </div>
      {iframeSrc ? (
        <iframe
          src={iframeSrc}
          title="嵌入图表预览"
          sandbox="allow-scripts"
          className="h-[280px] w-full rounded-lg border border-gray-200 dark:border-gray-800"
        />
      ) : null}
    </div>
  );
}
