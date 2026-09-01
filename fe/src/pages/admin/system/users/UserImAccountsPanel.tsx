import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { IM_CHANNEL_LABELS } from "@/lib/imChannels";
import { queryKeys } from "@/lib/queryKeys";
import { mapUserError } from "./userErrors";
import { UserSheetSection } from "./UserSheetSection";

export type ImAccounts = {
  dingtalk?: string;
  feishu?: string;
};

type ImAccountSources = Partial<Record<keyof ImAccounts, string>>;

type Props = {
  userId: string;
  email?: string | null;
  imAccounts?: ImAccounts;
  imAccountSources?: ImAccountSources;
  onActionError: (message: string | null) => void;
  onSaved?: (next: { email?: string | null; imAccounts: ImAccounts }) => void;
};

const SOURCE_LABEL: Record<string, string> = {
  oauth: "自助绑定",
  admin: "管理员修改",
};

export function UserImAccountsPanel({
  userId,
  email,
  imAccounts,
  imAccountSources,
  onActionError,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const [emailValue, setEmailValue] = useState(email ?? "");
  const [imValues, setImValues] = useState<ImAccounts>(imAccounts ?? {});

  useEffect(() => {
    setEmailValue(email ?? "");
    setImValues(imAccounts ?? {});
  }, [userId, email, imAccounts]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const imPayload: Record<string, string> = {
        dingtalk: imValues.dingtalk?.trim() ?? "",
        feishu: imValues.feishu?.trim() ?? "",
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
        imAccounts: data.imAccounts ?? imValues,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => onActionError(mapUserError(err)),
  });

  return (
    <UserSheetSection
      title="联系方式"
      description="邮箱用于邮件投递；IM 账号可由用户自助绑定，管理员亦可在此兜底填写。"
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
        {(["dingtalk", "feishu"] as const).map((channel) => (
          <div key={channel} className="grid gap-1.5">
            <Label htmlFor={`user-im-${channel}-${userId}`}>
              {IM_CHANNEL_LABELS[channel]}
              {imAccountSources?.[channel] ? (
                <span className="ml-2 text-theme-xs font-normal text-gray-500">
                  （{SOURCE_LABEL[imAccountSources[channel]!] ?? imAccountSources[channel]}）
                </span>
              ) : null}
            </Label>
            <Input
              id={`user-im-${channel}-${userId}`}
              value={imValues[channel] ?? ""}
              onChange={(e) => setImValues((prev) => ({ ...prev, [channel]: e.target.value }))}
              placeholder={`${IM_CHANNEL_LABELS[channel]} userid`}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </UserSheetSection>
  );
}
