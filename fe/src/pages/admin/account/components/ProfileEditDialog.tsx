import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import type { MeProfile } from "../account-types";

type ProfileEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MeProfile;
  focus?: "profile" | "email";
};

export function ProfileEditDialog({
  open,
  onOpenChange,
  profile,
}: ProfileEditDialogProps) {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [email, setEmail] = useState(profile.email);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName(profile.displayName);
    setEmail(profile.email);
    setError(null);
  }, [open, profile.displayName, profile.email]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch<MeProfile>("/api/v1/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName, email }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.me });
      await refresh();
      toast.success("资料已更新");
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setError(mapApiError(err));
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑基本资料</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="edit-display-name">显示名称</Label>
            <Input
              id="edit-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">电子邮箱</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="text-theme-xs text-error-600 dark:text-error-400">{error}</p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "保存中…" : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
