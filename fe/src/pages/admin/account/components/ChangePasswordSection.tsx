import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function ChangePasswordSection() {
  const [form, setForm] = useState<ChangePasswordPayload>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (form.newPassword !== form.confirmPassword) {
        throw new Error("两次输入的新密码不一致");
      }
      await apiFetch("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
    },
    onSuccess: () => {
      toast.success("密码已更新");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setError(null);
    },
    onError: (err: unknown) => {
      setError(mapApiError(err));
    },
  });

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">修改密码</h2>
      <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
        更新当前账号的登录密码。
      </p>
      <form
        className="mt-4 grid max-w-md gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="current-password">当前密码</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, currentPassword: event.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-password">新密码</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.newPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, newPassword: event.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">确认新密码</Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
            required
          />
        </div>
        {error ? <p className="text-theme-xs text-error-600 dark:text-error-400">{error}</p> : null}
        <div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "保存中…" : "更新密码"}
          </Button>
        </div>
      </form>
    </section>
  );
}
