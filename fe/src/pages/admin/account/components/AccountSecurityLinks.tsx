import type { ReactNode } from "react";
import { ChevronRight, KeyRound, LayoutDashboard, Mail } from "lucide-react";
import { Link } from "react-router";
import { ACCOUNT_PREFERENCES_PATH, ACCOUNT_SECURITY_PATH } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type SecurityLinkItem = {
  icon: ReactNode;
  title: string;
  description: string;
  to?: string;
  onClick?: () => void;
  trailing?: ReactNode;
};

function SecurityLinkRow({ item }: { item: SecurityLinkItem }) {
  const className = cn(
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
    "hover:bg-gray-50 dark:hover:bg-white/[0.03]",
    "focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/10",
  );
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {item.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {item.title}
        </span>
        <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
          {item.description}
        </span>
      </span>
      {item.trailing ?? (
        <ChevronRight className="size-5 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden />
      )}
    </>
  );

  if (item.to) {
    return (
      <Link to={item.to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={item.onClick}>
      {content}
    </button>
  );
}

type AccountSecurityLinksProps = {
  email: string;
  onEditEmail: () => void;
};

export function AccountSecurityLinks({ email, onEditEmail }: AccountSecurityLinksProps) {
  const items: SecurityLinkItem[] = [
    {
      icon: <Mail className="size-5" aria-hidden />,
      title: "电子邮箱",
      description: email || "用于登录与通知的邮箱地址",
      onClick: onEditEmail,
    },
    {
      icon: <KeyRound className="size-5" aria-hidden />,
      title: "登录密码",
      description: "定期更换密码以保障账户安全",
      to: ACCOUNT_SECURITY_PATH,
    },
    {
      icon: <LayoutDashboard className="size-5" aria-hidden />,
      title: "默认看板",
      description: "配置登录后优先进入的个人视图",
      to: ACCOUNT_PREFERENCES_PATH,
    },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
      <header className="mb-3">
        <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          安全与偏好
        </h2>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          修改登录凭据或管理工作台偏好
        </p>
      </header>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <SecurityLinkRow key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}
