import { useRef, useState } from "react";
import { Monitor } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { destroy, init, resize, type EmbedSdkHandle } from "@/sdk/embedSdk";

export function EmbedSdkDemoPage() {
  const [chartId, setChartId] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const handleRef = useRef<EmbedSdkHandle | null>(null);

  const issueToken = async () => {
    setError(null);
    try {
      const data = await apiFetch<{ token: string }>("/api/v1/embed/token", {
        method: "POST",
        body: JSON.stringify({ chartId: chartId.trim() }),
      });
      setToken(data.token);
    } catch {
      setError("签发嵌入令牌失败，请检查图表 ID");
    }
  };

  const runInit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (handleRef.current) destroy(handleRef.current);
      handleRef.current = await init({
        container: "#embed-host",
        token: token.trim(),
        targetType: "chart",
        targetId: chartId.trim(),
        onError: (msg) => setError(msg),
      });
    } catch {
      setError("初始化嵌入失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-theme-xl">
            <Monitor className="size-4" />
            SDK 嵌入演示
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="demo-chart-id">图表 ID</Label>
            <Input
              id="demo-chart-id"
              className="h-11 rounded-lg"
              value={chartId}
              onChange={(e) => setChartId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-token">嵌入令牌</Label>
            <Input
              id="demo-token"
              type="password"
              className="h-11 rounded-lg"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={issueToken}>
              模拟签发
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-11 rounded-lg"
              disabled={loading || !chartId || !token}
              onClick={runInit}
            >
              {loading ? "初始化中…" : "初始化嵌入"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => handleRef.current && destroy(handleRef.current)}
            >
              销毁嵌入
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => handleRef.current && resize(handleRef.current, 360, 320)}
            >
              调整尺寸
            </Button>
          </div>
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-error-500 bg-error-50 p-3 text-theme-sm text-error-700 dark:bg-error-500/15"
            >
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <div
        id="embed-host"
        className="min-h-[240px] rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
      />
    </div>
  );
}
