import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type ChartPanelProps = {
  title: string;
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry: () => void;
  children: ReactNode;
};

export function ChartPanel({ title, loading, error, empty, onRetry, children }: ChartPanelProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-3 truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h3>
      {loading ? (
        <Skeleton className="min-h-[180px] w-full rounded-lg" aria-busy="true" />
      ) : error ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-lg border border-error-500 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/15">
          <p className="text-theme-sm text-error-700 dark:text-error-400">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            重试
          </Button>
        </div>
      ) : empty ? (
        <div className="flex min-h-[180px] items-center justify-center text-theme-sm text-gray-500">
          暂无数据
        </div>
      ) : (
        children
      )}
    </div>
  );
}
