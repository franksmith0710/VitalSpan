import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LIST_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="分页"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
  ),
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn("", className)} {...props} />,
);
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & React.ComponentProps<"button">;

const PaginationLink = ({ className, isActive, disabled, ...props }: PaginationLinkProps) => (
  <button
    type="button"
    aria-current={isActive ? "page" : undefined}
    disabled={disabled}
    className={cn(
      "inline-flex size-10 items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/20 disabled:pointer-events-none disabled:opacity-50",
      isActive
        ? "bg-brand-500 text-white hover:bg-brand-600"
        : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5",
      className,
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="上一页"
    className={cn("h-10 w-auto gap-1 px-2.5 whitespace-nowrap", className)}
    {...props}
  >
    <ChevronLeft className="size-4" />
    <span className="sr-only sm:not-sr-only sm:inline">上一页</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="下一页"
    className={cn("h-10 w-auto gap-1 px-2.5 whitespace-nowrap", className)}
    {...props}
  >
    <span className="sr-only sm:not-sr-only sm:inline">下一页</span>
    <ChevronRight className="size-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex size-10 items-center justify-center text-gray-500", className)}
    {...props}
  >
    <MoreHorizontal className="size-4" />
    <span className="sr-only">更多页</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export type PaginationSizeChangerProps = {
  pageSize: number;
  pageSizeOptions?: number[];
  onPageSizeChange: (size: number) => void;
  className?: string;
};

export function PaginationSizeChanger({
  pageSize,
  pageSizeOptions = [...LIST_PAGE_SIZE_OPTIONS],
  onPageSizeChange,
  className,
}: PaginationSizeChangerProps) {
  const labelId = React.useId();

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-theme-sm text-gray-500 dark:text-gray-400",
        className,
      )}
    >
      <span id={labelId}>每页</span>
      <Select
        value={String(pageSize)}
        onValueChange={(value) => onPageSizeChange(Number(value))}
      >
        <SelectTrigger
          className="h-9 w-[4.5rem] shrink-0 px-2.5 shadow-none"
          aria-label="每页条数"
          aria-labelledby={labelId}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="top" align="start" position="popper" className="min-w-[5.5rem]">
          {pageSizeOptions.map((size) => (
            <SelectItem key={size} value={String(size)} className="py-2 pr-8 pl-3">
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>条</span>
    </div>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
