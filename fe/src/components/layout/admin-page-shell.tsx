import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TruncateHint } from "@/components/ui/hint-tooltip";

export type AdminPageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** 占满 main 剩余高度，内部区域自行滚动 */
  layout?: "default" | "fill" | "list";
  /** title 已自带 h1 等标题语义时设为 true，避免嵌套标题 */
  titleUnwrapped?: boolean;
  /** 点击页头空白（非按钮/链接）时的回调，例如看板编辑切回仪表板配置 */
  onHeaderBlankPointerDown?: () => void;
};

export function AdminPageShell({
  title,
  description,
  actions,
  children,
  className,
  layout = "default",
  titleUnwrapped = false,
  onHeaderBlankPointerDown,
}: AdminPageShellProps) {
  const isFillLayout = layout === "fill" || layout === "list";

  return (
    <div
      className={cn(
        isFillLayout
          ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden md:gap-3"
          : "grid shrink-0 gap-6",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 flex-col sm:flex-row sm:items-start sm:justify-between",
          isFillLayout ? "gap-2" : "gap-3",
        )}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onHeaderBlankPointerDown?.();
        }}
      >
        <div
          className="grid min-w-0 flex-1 gap-1.5"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onHeaderBlankPointerDown?.();
          }}
        >
          {titleUnwrapped ? (
            title
          ) : (
            <h1 className="truncate text-title-sm font-semibold text-gray-900 dark:text-white">{title}</h1>
          )}
          {description ? (
            typeof description === "string" ? (
              <TruncateHint
                title={description}
                as="div"
                className="text-theme-sm text-gray-500 dark:text-gray-400"
              >
                {description}
              </TruncateHint>
            ) : (
              <div className="truncate text-theme-sm text-gray-500 dark:text-gray-400">{description}</div>
            )
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {isFillLayout ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
