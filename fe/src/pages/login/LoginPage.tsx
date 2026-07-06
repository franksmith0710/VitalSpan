import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { setAuthToken } from "@/lib/auth-token";
import { resolveDefaultDashboardPath } from "@/lib/defaultViewResolve";

type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, refresh } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/admin";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL ??
        (import.meta.env.DEV ? "" : "http://localhost:8000");
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await response.json().catch(() => ({}))) as LoginResponse & {
        code?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new ApiRequestError(body.message ?? "用户名或密码错误", body.code);
      }
      setAuthToken(body.accessToken);
      await refresh();
      const me = await apiFetch<{ roles: string[] }>("/api/v1/me");
      const resolved = await resolveDefaultDashboardPath(me.roles ?? []);
      navigate(resolved ?? from, { replace: true });
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <Card className="w-full max-w-md" variant="outlined" elevation={2}>
        <CardHeader className="flex-col items-start gap-2">
          <CardTitle className="text-title-sm">登录 VitalSpan</CardTitle>
          <CardDescription>使用管理员账号登录管理后台</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={(e) => void handleSubmit(e)}>
            {error ? (
              <div
                className="rounded-xl border border-error-500 bg-error-50 p-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
                role="alert"
              >
                {error}
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="primary" className="h-11 w-full" disabled={submitting}>
              <LogIn className="size-4" aria-hidden />
              {submitting ? "登录中…" : "登录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
