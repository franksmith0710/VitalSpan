import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AdminPageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 占满 main 剩余高度，内部区域自行滚动 */
  layout?: "default" | "fill";
};

export function AdminPageShell({
  title,
  description,
  actions,
  children,
  className,
  layout = "default",
}: AdminPageShellProps) {
  return (
    <div
      className={cn(
        layout === "fill"
          ? "flex min-h-0 flex-1 flex-col gap-6 overflow-hidden"
          : "grid gap-6",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-1.5">
          <h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h1>
          {description ? (
            <div className="max-w-3xl text-theme-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {description}
            </div>
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
