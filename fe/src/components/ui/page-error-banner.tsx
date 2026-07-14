import { createPortal } from "react-dom";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageErrorBannerProps = {
  message: string;
  onRetry: () => void;
  className?: string;
};

/** 页面级错误：固定浮层置顶，不占文档流布局 */
export function PageErrorBanner({ message, onRetry, className }: PageErrorBannerProps) {
  if (!message) return null;

  return createPortal(
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-[4.5rem] z-99999 flex justify-center px-4 md:px-6",
        className,
      )}
    >
      <div
        role="alert"
        className={cn(
          "pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 shadow-theme-lg",
          "sm:flex-row sm:items-center sm:justify-between",
          "dark:border-error-500/30 dark:bg-gray-900",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-error-500" aria-hidden />
          <p className="min-w-0 text-theme-sm leading-relaxed text-error-700 dark:text-error-400">
            {message}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 self-end sm:self-auto" onClick={onRetry}>
          重试
        </Button>
      </div>
    </div>,
    document.body,
  );
}
