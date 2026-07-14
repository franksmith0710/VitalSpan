import type { ReactNode } from "react";
import { PaginationBar, type PaginationBarProps } from "@/components/ui/pagination-bar";
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
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]",
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
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.06]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{filters}</div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
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
        "shrink-0 border-t border-gray-100 px-5 py-4 dark:border-white/[0.06]",
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

type DataTableEmptyProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
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
