import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { primaryRoleLabel, type SessionRole } from "@/lib/session";
import type { MeProfile } from "../account-types";

type InfoRow = { label: string; value: ReactNode };

function InfoGrid({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]"
        >
          <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{row.label}</dt>
          <dd className="mt-1 text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type AccountInfoCardProps = {
  profile: MeProfile;
};

export function AccountInfoCard({ profile }: AccountInfoCardProps) {
  const roleLabel = primaryRoleLabel(profile.roles as SessionRole[]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <header className="mb-5">
        <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">账户信息</h2>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          当前登录账户的基础资料与权限标识
        </p>
      </header>
      <InfoGrid
        rows={[
          { label: "用户 ID", value: <span className="font-mono text-theme-xs">{profile.id}</span> },
          { label: "显示名称", value: profile.displayName },
          { label: "登录账号", value: profile.username },
          { label: "平台角色", value: roleLabel },
          { label: "电子邮箱", value: profile.email },
          {
            label: "账户状态",
            value: (
              <Badge variant="light" color="success" size="sm">
                正常
              </Badge>
            ),
          },
        ]}
      />
    </section>
  );
}
