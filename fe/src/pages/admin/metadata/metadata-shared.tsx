import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-error-500 bg-error-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-error-500/30 dark:bg-error-500/15">
      <p className="text-theme-sm text-error-700 dark:text-error-400">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>重试</Button>
    </div>
  );
}

export function MetaDataTable({
  loading, empty, headers, rows,
}: { loading: boolean; empty: boolean; headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <table className="min-w-[640px] w-full text-left text-theme-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <tr>{headers.map((h) => <th key={h} className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{h}</th>)}</tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <tr key={i}><td colSpan={headers.length} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
          )) : null}
          {empty && !loading ? (
            <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">暂无数据</td></tr>
          ) : null}
          {!loading ? rows.map((cells, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
              {cells.map((cell, j) => <td key={j} className="px-4 py-3 text-gray-800 dark:text-white/90">{cell}</td>)}
            </tr>
          )) : null}
        </tbody>
      </table>
    </div>
  );
}
