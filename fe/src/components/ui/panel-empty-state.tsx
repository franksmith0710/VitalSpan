import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelEmptyStateSize = "sm" | "md" | "lg";
type PanelEmptyStateVariant = "plain" | "framed" | "elevated";
type PanelEmptyStateTone = "neutral" | "brand";

const SIZE_CLASS: Record<PanelEmptyStateSize, string> = {
  sm: "min-h-[180px] px-4 py-10",
  md: "min-h-[280px] px-6 py-12",
  lg: "min-h-[420px] px-6 py-14",
};

export type PanelEmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  footer?: ReactNode;
  size?: PanelEmptyStateSize;
  variant?: PanelEmptyStateVariant;
  tone?: PanelEmptyStateTone;
  headingId?: string;
  className?: string;
};

export function PanelEmptyState({
  icon,
  title,
  description,
  action,
  footer,
  size = "md",
  variant = "plain",
  tone = "brand",
  headingId,
  className,
}: PanelEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center text-center",
        SIZE_CLASS[size],
        variant === "framed" &&
          "rounded-2xl border border-dashed border-gray-300 bg-gradient-to-b from-gray-50/90 to-white dark:border-gray-700 dark:from-white/[0.03] dark:to-white/[0.01]",
        variant === "elevated" &&
          "rounded-2xl border border-gray-200 bg-white shadow-theme-md dark:border-gray-800 dark:bg-gray-900",
        className,
      )}
    >
      <div
        className={cn(
          "mb-5 flex size-16 items-center justify-center rounded-2xl shadow-theme-xs ring-1",
          tone === "brand"
            ? "bg-brand-50 text-brand-600 ring-brand-500/10 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/20"
            : "bg-gray-100 text-gray-500 ring-gray-200/80 dark:bg-white/5 dark:text-gray-400 dark:ring-gray-800",
        )}
      >
        {icon}
      </div>
      <h3
        id={headingId}
        className="text-theme-lg font-semibold tracking-tight text-gray-900 dark:text-white"
      >
        {title}
      </h3>
      <p className="mt-2 max-w-md text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
      {footer ? <div className="mt-8 w-full">{footer}</div> : null}
    </div>
  );
};

type PanelEmptyStateStep = {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function PanelEmptyStateSteps({ steps }: { steps: readonly PanelEmptyStateStep[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {steps.map(({ step, title, description, icon: Icon }) => (
        <div
          key={step}
          className="rounded-xl border border-gray-200 bg-gray-50/70 p-5 text-left dark:border-gray-800 dark:bg-white/[0.02]"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-theme-xs font-semibold text-white">
              {step}
            </span>
            <span className="flex size-9 items-center justify-center rounded-lg bg-white text-gray-600 shadow-theme-xs dark:bg-gray-900 dark:text-gray-300">
              <Icon className="size-4" aria-hidden />
            </span>
          </div>
          <h4 className="mt-4 text-theme-sm font-semibold text-gray-800 dark:text-white/90">{title}</h4>
          <p className="mt-1.5 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      ))}
    </div>
  );
}

type ListGhostEmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  headingId?: string;
  rows?: number;
  className?: string;
};

function GhostListRow() {
  return (
    <li className="flex items-center justify-between gap-3 py-3.5">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-[42%] max-w-[200px] rounded-md bg-gray-200/90 dark:bg-white/10" />
        <div className="h-3 w-[28%] max-w-[140px] rounded-md bg-gray-100 dark:bg-white/5" />
      </div>
      <div className="h-8 w-14 shrink-0 rounded-lg bg-gray-100 dark:bg-white/5" />
    </li>
  );
}

/** 列表卡片内的空态：骨架行背景 + 居中浮层说明。 */
export function ListGhostEmptyState({
  icon,
  title,
  description,
  action,
  headingId,
  rows = 3,
  className,
}: ListGhostEmptyStateProps) {
  return (
    <div
      className={cn("relative min-h-[300px] w-full overflow-hidden rounded-xl", className)}
      aria-labelledby={headingId}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-gray-50/40 to-white dark:from-white/[0.02] dark:via-white/[0.01] dark:to-transparent" />
      <ul className="relative divide-y divide-gray-100 px-1 dark:divide-gray-800" aria-hidden>
        {Array.from({ length: rows }).map((_, index) => (
          <GhostListRow key={index} />
        ))}
      </ul>

      <div className="absolute inset-0 flex items-center justify-center bg-white/55 p-4 backdrop-blur-[3px] dark:bg-gray-950/55">
        <div className="w-full max-w-md">
          <PanelEmptyState
            icon={icon}
            title={title}
            description={description}
            action={action}
            headingId={headingId}
            size="sm"
            variant="elevated"
            className="min-h-0 py-8"
          />
        </div>
      </div>
    </div>
  );
}
