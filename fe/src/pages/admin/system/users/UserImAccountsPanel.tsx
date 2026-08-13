import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
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

const FIELDS: { key: keyof ImAccounts; label: string; placeholder: string }[] = [
  { key: "dingtalk", label: "钉钉账号", placeholder: "钉钉 userid" },
  { key: "wecom", label: "企业微信账号", placeholder: "企微 userid" },
  { key: "feishu", label: "飞书账号", placeholder: "飞书 user_id" },
];

export function UserImAccountsPanel({
  userId,
  email,
  imAccounts,
  onActionError,
  onSaved,
}: Props) {
  const queryClient = useQueryClient();
  const [emailValue, setEmailValue] = useState(email ?? "");
  const [accounts, setAccounts] = useState<ImAccounts>(imAccounts ?? {});

  useEffect(() => {
    setEmailValue(email ?? "");
    setAccounts(imAccounts ?? {});
  }, [userId, email, imAccounts?.dingtalk, imAccounts?.wecom, imAccounts?.feishu]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const imPayload: Record<string, string> = {
        dingtalk: accounts.dingtalk?.trim() ?? "",
        wecom: accounts.wecom?.trim() ?? "",
        feishu: accounts.feishu?.trim() ?? "",
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
        imAccounts: data.imAccounts ?? accounts,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => onActionError(mapUserError(err)),
  });

  return (
    <UserSheetSection
      title="联系方式"
      description="邮件发给这个邮箱；钉钉/企微/飞书发给绑的那个号。没绑号，对应通道会失败，不会改发到群。"
      icon={<MessageCircle className="size-4" aria-hidden />}
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
        {FIELDS.map((field) => (
          <div key={field.key} className="grid gap-1.5">
            <Label htmlFor={`user-im-${field.key}-${userId}`}>{field.label}</Label>
            <Input
              id={`user-im-${field.key}-${userId}`}
              value={accounts[field.key] ?? ""}
              onChange={(e) => setAccounts((prev) => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              autoComplete="off"
            />
          </div>
        ))}
      </div>
    </UserSheetSection>
  );
}
