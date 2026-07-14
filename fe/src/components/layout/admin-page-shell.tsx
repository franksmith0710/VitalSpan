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
  /** title 已自带 h1 等标题语义时设为 true，避免嵌套标题 */
  titleUnwrapped?: boolean;
};

export function AdminPageShell({
  title,
  description,
  actions,
  children,
  className,
  layout = "default",
  titleUnwrapped = false,
}: AdminPageShellProps) {
  return (
    <div
      className={cn(
        layout === "fill"
          ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden md:gap-3"
          : "grid shrink-0 gap-6",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-col sm:flex-row sm:items-start sm:justify-between",
          layout === "fill" ? "gap-2" : "gap-3",
        )}
      >
        <div className="grid min-w-0 gap-1.5">
          {titleUnwrapped ? (
            title
          ) : (
            <h1 className="text-title-sm font-semibold text-gray-900 dark:text-white">{title}</h1>
          )}
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
