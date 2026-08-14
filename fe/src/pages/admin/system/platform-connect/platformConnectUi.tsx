import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { EMAIL_SMTP_SLOTS, type EmailSmtpSlot } from "@/lib/emailSmtpSlots";
import { cn } from "@/lib/utils";
import {
  SCHEDULE_SECTION_BODY_CLASS,
  SCHEDULE_SECTION_CARD_CLASS,
  SCHEDULE_SECTION_FOOTER_CLASS,
  SCHEDULE_SECTION_HEADER_CLASS,
} from "@/pages/admin/reports/components/scheduleDialogUi";

export type EmailConfigSummary = {
  slot: EmailSmtpSlot;
  label: string;
  configured: boolean;
  source: "db" | "env" | "none";
  host?: string | null;
  port?: number | null;
  from?: string | null;
};

export const SOURCE_LABEL: Record<string, string> = {
  db: "管理面已保存",
  env: "环境变量回落（仅 QQ · 开发用）",
  none: "未配置",
};

export const SLOT_SETUP_HINT: Record<EmailSmtpSlot, string> = {
  qq: "在 QQ 邮箱 → 设置 → 账户，开启 POP3/SMTP 并生成授权码后填入下方。",
  "163": "在 163 邮箱 → 设置 → POP3/SMTP/IMAP，开启 SMTP 并生成授权码后填入下方。",
};

export function ConnectFormSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className={SCHEDULE_SECTION_CARD_CLASS}>
      <div className={SCHEDULE_SECTION_HEADER_CLASS}>
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-200/80 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/25">
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-theme-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className={SCHEDULE_SECTION_BODY_CLASS}>{children}</div>
    </section>
  );
}

export function ConnectField({
  id,
  label,
  hint,
  hintClassName,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: string;
  hintClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      {children}
      <p
        className={cn(
          "min-h-[1.125rem] text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400",
          hintClassName,
          !hint && "invisible",
        )}
        aria-hidden={!hint}
      >
        {hint ?? "\u00a0"}
      </p>
    </div>
  );
}

export function ConnectActionBar({
  hint,
  children,
}: {
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn(SCHEDULE_SECTION_CARD_CLASS, "overflow-visible")}>
      <div className={cn(SCHEDULE_SECTION_FOOTER_CLASS, "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}>
        {hint ? (
          <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">{hint}</p>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </section>
  );
}

export function ChannelPickerCard({
  config,
  active,
  onSelect,
}: {
  config: EmailConfigSummary;
  active: boolean;
  onSelect: () => void;
}) {
  const preset = EMAIL_SMTP_SLOTS.find((item) => item.slot === config.slot)!;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition-all",
        active
          ? "border-brand-300 bg-brand-50/50 shadow-theme-sm ring-1 ring-brand-500/15 dark:border-brand-500/35 dark:bg-brand-500/10"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              active
                ? "bg-brand-500 text-white shadow-theme-xs"
                : "bg-gray-100 text-gray-500 group-hover:bg-gray-200/80 dark:bg-white/10 dark:text-gray-300",
            )}
          >
            <span className="text-theme-sm font-semibold">{config.slot === "qq" ? "QQ" : "163"}</span>
          </span>
          <div className="min-w-0">
            <p className="text-theme-sm font-semibold text-gray-900 dark:text-white">{config.label}</p>
            <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
              {preset.host}:{preset.port}
            </p>
          </div>
        </div>
        <Badge variant="light" color={config.configured ? "success" : "warning"} size="sm">
          {config.configured ? "已就绪" : "未配置"}
        </Badge>
      </div>
      <p className="text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
        {config.configured
          ? `${SOURCE_LABEL[config.source] ?? config.source}${config.from ? ` · ${config.from}` : ""}`
          : "保存后将自动探测 SMTP 连通性"}
      </p>
    </button>
  );
}
