import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { mapUserError } from "./userErrors";
import { UserSheetSection } from "./UserSheetSection";

export type ImAccounts = {
  dingtalk?: string;
  wecom?: string;
  feishu?: string;
};

type Props = {
  userId: string;
  email?: string | null;
  imAccounts?: ImAccounts;
  onActionError: (message: string | null) => void;
  onSaved?: (next: { email?: string | null; imAccounts: ImAccounts }) => void;
};

export function UserImAccountsPanel({
  userId,
  email,
  imAccounts,
  onActionError,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const [emailValue, setEmailValue] = useState(email ?? "");

  useEffect(() => {
    setEmailValue(email ?? "");
  }, [userId, email]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const imPayload: Record<string, string> = {
        dingtalk: imAccounts?.dingtalk?.trim() ?? "",
        wecom: imAccounts?.wecom?.trim() ?? "",
        feishu: imAccounts?.feishu?.trim() ?? "",
      };
      return apiFetch<{ email?: string | null; imAccounts?: ImAccounts }>(
        `/api/v1/users/${userId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            email: emailValue.trim(),
            imAccounts: imPayload,
          }),
        },
      );
    },
    onSuccess: async (data) => {
      toast.success("联系方式已更新");
      onActionError(null);
      onSaved?.({
        email: data.email ?? emailValue.trim(),
        imAccounts: data.imAccounts ?? imAccounts ?? {},
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => onActionError(mapUserError(err)),
  });

  return (
    <UserSheetSection
      title="联系方式"
      description="定时报告与系统通知将发到该邮箱。"
      icon={<Mail className="size-4" aria-hidden />}
      footer={
        <Button
          type="button"
          variant="primary"
          className="w-full sm:w-auto"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? "保存中…" : "保存联系方式"}
        </Button>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`user-email-${userId}`}>邮箱</Label>
          <Input
            id={`user-email-${userId}`}
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            placeholder="name@example.com"
            autoComplete="off"
          />
        </div>
      </div>
    </UserSheetSection>
  );
}
