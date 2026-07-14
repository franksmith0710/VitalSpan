import { List } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RailFoldIcon({ className }: { className?: string }) {
  return <List className={cn("size-4 text-gray-400 dark:text-gray-500", className)} aria-hidden />;
}

/** DataEase 收回：收起后的右侧竖条（汉堡 + 竖排标签） */
export function CollapsedRailTab({
  label,
  onExpand,
  className,
}: {
  label: string;
  onExpand: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-full w-8 shrink-0 flex-col items-center border-l border-gray-200 bg-white py-2.5 transition-colors",
        "hover:bg-gray-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/30",
        "dark:border-gray-800 dark:bg-white/[0.02] dark:hover:bg-white/[0.05]",
        className,
      )}
      aria-label={`展开${label}`}
      onClick={onExpand}
    >
      <RailFoldIcon />
      <span
        className="mt-3 max-h-[min(12rem,calc(100%-2.5rem))] truncate text-[11px] leading-tight text-gray-500 dark:text-gray-400"
        style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
      >
        {label}
      </span>
    </button>
  );
}

export function RailFoldHeader({
  label,
  onCollapse,
  className,
}: {
  label: string;
  onCollapse: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center justify-end border-b border-gray-100 px-1 dark:border-gray-800",
        className,
      )}
    >
      <IconButton
        type="button"
        variant="ghost"
        size="sm"
        className="size-7 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
        aria-label={`收起${label}`}
        onClick={onCollapse}
      >
        <RailFoldIcon />
      </IconButton>
    </div>
  );
}
