import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { isUserLocked, type UserAccountFields } from "./userAccountStatus";
import { mapUserError } from "./userErrors";

type UserAccountStatusPanelProps = {
  userId: string;
  username: string;
  isActive: boolean;
  lockedUntil: string | null;
  onStatusChange: (status: UserAccountFields) => void;
  onActionError: (message: string | null) => void;
};

type UserStatusResponse = {
  isActive: boolean;
  lockedUntil: string | null;
};

export function UserAccountStatusPanel({
  userId,
  username,
  isActive,
  lockedUntil,
  onStatusChange,
  onActionError,
}: UserAccountStatusPanelProps) {
  const queryClient = useQueryClient();
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const locked = isUserLocked(lockedUntil);

  const statusMutation = useMutation({
    mutationFn: async (action: "disable" | "enable" | "unlock") => {
      const res = await apiFetch<UserStatusResponse>(`/api/v1/users/${userId}/${action}`, {
        method: "POST",
      });
      return res;
    },
    onSuccess: async (res, action) => {
      onStatusChange({ isActive: res.isActive, lockedUntil: res.lockedUntil ?? null });
      onActionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      if (action === "disable") setDisableConfirmOpen(false);
      toast.success(
        action === "disable" ? "账号已停用" : action === "enable" ? "账号已启用" : "账号已解锁",
      );
    },
    onError: (err) => {
      setDisableConfirmOpen(false);
      onActionError(mapUserError(err));
    },
  });

  return (
    <>
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">账号状态</p>
          {locked ? (
            <Badge variant="light" color="warning" size="sm">
              已锁定
            </Badge>
          ) : isActive ? (
            <Badge variant="light" color="success" size="sm">
              正常
            </Badge>
          ) : (
            <Badge variant="light" color="error" size="sm">
              已停用
            </Badge>
          )}
        </div>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          停用后用户无法登录；多次登录失败会自动锁定，可在此解锁。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {isActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDisableConfirmOpen(true)}
              disabled={statusMutation.isPending}
            >
              停用账号
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate("enable")}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? "启用中…" : "重新启用"}
            </Button>
          )}
          {locked ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate("unlock")}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? "解锁中…" : "解除锁定"}
            </Button>
          ) : null}
        </div>
      </div>

      <AlertDialog open={disableConfirmOpen} onOpenChange={setDisableConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认停用账号？</AlertDialogTitle>
            <AlertDialogDescription>
              停用后用户「{username}」将无法登录，已发放的会话也会失效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("disable")}
            >
              {statusMutation.isPending ? "停用中…" : "确认停用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
