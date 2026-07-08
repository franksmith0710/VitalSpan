import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";

type MeProfile = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  roles: string[];
};

export function AccountProfilePage() {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiFetch<MeProfile>("/api/v1/me"),
  });

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.displayName);
    setEmail(data.email);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<MeProfile>("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName, email }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      await refresh();
      toast.success("个人资料已保存");
      setError(null);
    },
    onError: (err: unknown) => {
      setError(mapApiError(err));
    },
  });

  return (
    <AdminPageShell
      title="个人资料"
      description="查看与维护当前登录账号的基本信息。"
    >
      {isLoading ? (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-full max-w-md" />
          <Skeleton className="h-11 w-full max-w-md" />
        </div>
      ) : isError || !data ? (
        <div className="rounded-2xl border border-error-200 bg-error-50 p-6 dark:border-error-500/30 dark:bg-error-500/10">
          <p className="text-theme-sm text-error-700 dark:text-error-400">无法加载个人资料</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            重试
          </Button>
        </div>
      ) : (
        <form
          className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div className="grid max-w-md gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">登录名</Label>
              <Input id="username" value={data.username} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">显示名称</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            {error ? (
              <p className="text-theme-xs text-error-600 dark:text-error-400">{error}</p>
            ) : null}
            <div>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "保存中…" : "保存资料"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </AdminPageShell>
  );
}
