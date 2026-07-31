import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { mapUserError } from "./userErrors";

type UserResetPasswordPanelProps = {
  userId: string;
  username: string;
  onActionError: (message: string | null) => void;
};

export function UserResetPasswordPanel({
  userId,
  username,
  onActionError,
}: UserResetPasswordPanelProps) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ temporaryPassword: string }>(
        `/api/v1/users/${userId}/reset-password`,
        { method: "POST" },
      );
      return res.temporaryPassword;
    },
    onSuccess: (password) => {
      setResetConfirmOpen(false);
      if (password) setResetResult(password);
      toast.success("密码已重置");
      onActionError(null);
    },
    onError: (err) => {
      setResetConfirmOpen(false);
      onActionError(mapUserError(err));
    },
  });

  return (
    <>
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">登录密码</p>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          重置后将生成新的临时密码，请一次性交付给用户。
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => setResetConfirmOpen(true)}
        >
          重置密码
        </Button>
      </div>

      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认重置密码？</AlertDialogTitle>
            <AlertDialogDescription>
              将为用户「{username}」生成新的临时密码，旧密码立即失效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate()}
            >
              {resetPasswordMutation.isPending ? "重置中…" : "确认重置"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(resetResult)} onOpenChange={(o) => !o && setResetResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>临时密码已生成</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>请将以下密码交给用户 {username}：</p>
                <p className="break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-theme-sm dark:border-gray-800 dark:bg-white/[0.04]">
                  {resetResult}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={async () => {
                if (!resetResult) return;
                try {
                  await navigator.clipboard.writeText(resetResult);
                  toast.success("密码已复制");
                } catch {
                  toast.error("复制失败");
                }
              }}
            >
              复制密码
            </AlertDialogAction>
            <AlertDialogAction onClick={() => setResetResult(null)}>关闭</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
