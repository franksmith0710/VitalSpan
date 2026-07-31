import type { ReactNode } from "react";
import { PaginationBar, type PaginationBarProps } from "@/components/ui/pagination-bar";
import type { ListEmptyPreviewLayout } from "@/components/ui/list-empty-preview";
import { ListGhostEmptyState } from "@/components/ui/panel-empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export { PageErrorBanner } from "@/components/ui/page-error-banner";

/** 管理页白色面板外框：列表区、页头栏等与 main 灰底区分 */
export const ADMIN_PAGE_SURFACE_CLASS =
  "rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]";

/** AdminPageShell 页头外框（内边距由内部区块控制） */
export const ADMIN_PAGE_HEADER_FRAME_CLASS = cn(ADMIN_PAGE_SURFACE_CLASS, "shrink-0 overflow-hidden");

/** 页头内容区内边距 */
export const ADMIN_PAGE_HEADER_BODY_CLASS = "px-5 py-5";

/** 页头操作区：与标题块右对齐 */
export const ADMIN_PAGE_HEADER_ACTIONS_CLASS =
  "flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-2.5";

const ADMIN_PAGE_HEADER_ICON_TONE_CLASS = {
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
  success: "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400",
  blue: "bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
} as const;

/** 页头左侧图标块（对标 TailAdmin 页面 Hero 头图） */
export function AdminPageHeaderIcon({
  children,
  tone = "brand",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof ADMIN_PAGE_HEADER_ICON_TONE_CLASS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl",
        ADMIN_PAGE_HEADER_ICON_TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** 看板 / 大屏等列表卡片栅格：宽屏一行 4 列 */
export const LIST_PAGE_CARD_GRID_CLASS =
  "grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function ListPageSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        ADMIN_PAGE_SURFACE_CLASS,
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ListPageTableFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-5", className)}>
      {children}
    </div>
  );
}

export function ListPageToolbar({
  filters,
  actions,
  className,
}: {
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const hasFilters = filters != null;
  const actionsOnly = !hasFilters && actions != null;

  return (
    <div
      className={cn(
        "flex shrink-0 border-b border-gray-100 bg-gray-50/80 dark:border-white/[0.06] dark:bg-white/[0.02]",
        actionsOnly
          ? "justify-end px-5 py-3"
          : "flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {hasFilters ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{filters}</div>
      ) : null}
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function ListPageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("shrink-0 p-5", className)}>{children}</div>;
}

export function ListPageFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-gray-100 bg-gray-50/80 px-5 py-3 dark:border-white/[0.06] dark:bg-white/[0.02]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ListPagePagination(props: PaginationBarProps) {
  return (
    <ListPageFooter>
      <PaginationBar {...props} />
    </ListPageFooter>
  );
}

export type ListPageCardGridEmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  headingId?: string;
  layout?: Extract<ListEmptyPreviewLayout, "cards" | "data-screen">;
};

/** 卡片栅格列表空态（仪表板 / 数据大屏等）。 */
export function ListPageCardGridEmptyState({
  icon,
  title,
  description,
  action,
  headingId,
  layout = "cards",
}: ListPageCardGridEmptyStateProps) {
  return (
    <ListGhostEmptyState
      icon={icon}
      title={title}
      description={description}
      action={action}
      headingId={headingId}
      layout={layout}
      rows={3}
    />
  );
}

type DataTableEmptyProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  layout?: ListEmptyPreviewLayout;
};

export type DataTableProps = {
  loading: boolean;
  empty: boolean;
  headers: ReactNode[];
  rows: ReactNode[][];
  emptyState?: DataTableEmptyProps;
  lastColumnAlign?: "left" | "right";
  loadingRows?: number;
};

export function DataTable({
  loading,
  empty,
  headers,
  rows,
  emptyState,
  lastColumnAlign = "left",
  loadingRows = 4,
}: DataTableProps) {
  const lastIndex = headers.length - 1;

  if (empty && !loading && emptyState) {
    return (
      <ListGhostEmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
        headingId="data-table-empty"
        layout={emptyState.layout}
      />
    );
  }

  return (
    <div className="overflow-x-only">
      <Table size="comfortable" wrapperClassName="min-w-[640px] border-0 shadow-none">
      <TableHeader className="bg-gray-50/80 dark:bg-white/[0.02]">
        <TableRow className="hover:bg-transparent">
          {headers.map((header, index) => (
            <TableHead
              key={index}
              className={cn(
                index === lastIndex && lastColumnAlign === "right" && "text-right",
              )}
            >
              {header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading
          ? Array.from({ length: loadingRows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell colSpan={headers.length}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          : null}
        {!loading && empty ? (
          <TableRow>
            <TableCell
              colSpan={headers.length}
              className="py-12 text-center text-theme-sm text-gray-500 dark:text-gray-400"
            >
              暂无数据
            </TableCell>
          </TableRow>
        ) : null}
        {!loading
          ? rows.map((cells, rowIndex) => (
              <TableRow key={rowIndex}>
                {cells.map((cell, cellIndex) => (
                  <TableCell
                    key={cellIndex}
                    className={cn(
                      cellIndex === lastIndex && lastColumnAlign === "right" && "text-right",
                    )}
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))
          : null}
      </TableBody>
      </Table>
    </div>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
}
