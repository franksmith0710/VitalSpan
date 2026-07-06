import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AdminPageShellProps = {
  breadcrumb?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminPageShell({
  breadcrumb,
  title,
  description,
  actions,
  children,
  className,
}: AdminPageShellProps) {
  return (
    <div className={cn("grid gap-6", className)}>
      {breadcrumb}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1">
          <h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-theme-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {children}
    </div>
  );
}
