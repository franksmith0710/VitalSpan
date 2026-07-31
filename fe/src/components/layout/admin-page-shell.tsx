import type { ReactNode } from "react";
import {
  ADMIN_PAGE_HEADER_ACTIONS_CLASS,
  ADMIN_PAGE_HEADER_BODY_CLASS,
  ADMIN_PAGE_HEADER_FRAME_CLASS,
} from "@/components/layout/list-page-kit";
import { cn } from "@/lib/utils";
import { TruncateHint } from "@/components/ui/hint-tooltip";

export type AdminPageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  /** 页头左侧图标（建议 AdminPageHeaderIcon 包裹 lucide 图标） */
  icon?: ReactNode;
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

function PageHeaderDescription({
  description,
  variant,
  inline,
}: {
  description: ReactNode;
  variant: "hero" | "toolbar";
  inline?: boolean;
}) {
  const className = cn(
    "min-w-0 text-gray-500 dark:text-gray-400",
    inline
      ? "hidden truncate text-theme-xs sm:block sm:max-w-md lg:max-w-xl"
      : variant === "hero"
        ? "mt-1 max-w-3xl text-theme-sm leading-relaxed line-clamp-2"
        : "mt-1.5 max-w-3xl text-theme-sm leading-snug line-clamp-2",
  );

  if (typeof description === "string") {
    return (
      <TruncateHint title={description} as="p" className={className}>
        {description}
      </TruncateHint>
    );
  }

  return <div className={className}>{description}</div>;
}

function PageHeaderTitle({
  title,
  titleUnwrapped,
  variant,
}: {
  title: ReactNode;
  titleUnwrapped: boolean;
  variant: "hero" | "toolbar";
}) {
  if (titleUnwrapped) {
    return <div className="min-w-0">{title}</div>;
  }

  return (
    <h1
      className={cn(
        "truncate font-semibold leading-tight tracking-tight text-gray-900 dark:text-white",
        variant === "hero" ? "text-lg sm:text-xl" : "text-title-sm",
      )}
    >
      {title}
    </h1>
  );
}

function PageHeaderHero({
  icon,
  title,
  description,
  actions,
  titleUnwrapped,
  onHeaderBlankPointerDown,
  bodyClassName,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleUnwrapped: boolean;
  onHeaderBlankPointerDown?: () => void;
  bodyClassName?: string;
}) {
  return (
    <header
      className={cn(ADMIN_PAGE_HEADER_BODY_CLASS, bodyClassName)}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onHeaderBlankPointerDown?.();
      }}
    >
      <div className="flex items-start gap-4 sm:gap-5">
        {icon ? <div className="shrink-0">{icon}</div> : null}
        <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
          <div
            className="min-w-0 flex-1"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) onHeaderBlankPointerDown?.();
            }}
          >
            <PageHeaderTitle title={title} titleUnwrapped={titleUnwrapped} variant="hero" />
            {description ? (
              <PageHeaderDescription description={description} variant="hero" />
            ) : null}
          </div>
          {actions ? <div className={cn(ADMIN_PAGE_HEADER_ACTIONS_CLASS, "pt-0.5")}>{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}

export function AdminPageShell({
  title,
  description,
  icon,
  actions,
  children,
  className,
  layout = "default",
  titleUnwrapped = false,
  onHeaderBlankPointerDown,
}: AdminPageShellProps) {
  const isFillLayout = layout === "fill";
  const isListLayout = layout === "list";
  const isCompactHeader = isFillLayout || isListLayout;
  const useToolbarHeader = isFillLayout && titleUnwrapped;

  return (
    <div
      className={cn(
        isCompactHeader
          ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden md:gap-3"
          : "grid shrink-0 gap-4",
        className,
      )}
    >
      <div className={ADMIN_PAGE_HEADER_FRAME_CLASS} data-testid="admin-page-header-frame">
        {useToolbarHeader ? (
          <header
            className="px-5 py-3"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) onHeaderBlankPointerDown?.();
            }}
          >
            <div className="flex min-h-9 items-center justify-between gap-3">
              <div
                className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5"
                onPointerDown={(event) => {
                  if (event.target === event.currentTarget) onHeaderBlankPointerDown?.();
                }}
              >
                <PageHeaderTitle title={title} titleUnwrapped={titleUnwrapped} variant="toolbar" />
                {description ? (
                  <>
                    <span
                      aria-hidden
                      className="hidden shrink-0 text-theme-xs text-gray-300 dark:text-gray-600 sm:inline"
                    >
                      ·
                    </span>
                    <PageHeaderDescription description={description} variant="toolbar" inline />
                  </>
                ) : null}
              </div>
              {actions ? <div className={ADMIN_PAGE_HEADER_ACTIONS_CLASS}>{actions}</div> : null}
            </div>
          </header>
        ) : (
          <PageHeaderHero
            icon={icon}
            title={title}
            description={description}
            actions={actions}
            titleUnwrapped={titleUnwrapped}
            onHeaderBlankPointerDown={onHeaderBlankPointerDown}
            bodyClassName={isFillLayout ? "py-4" : undefined}
          />
        )}
      </div>

      {isCompactHeader ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

export { AdminPageHeaderIcon } from "@/components/layout/list-page-kit";
