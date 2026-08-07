import { Link } from "react-router";
import { Pin, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prefabReportsRunPath } from "../reportRoutes";
import { cn } from "@/lib/utils";

type PrefabBinding = {
  bindingKey: string;
  displayName: string;
  analysisType: string;
};

type Props = {
  items: PrefabBinding[];
  pinnedKeys: string[];
  onTogglePin: (key: string) => void;
};

export function ReportCenterPrefabPanel({ items, pinnedKeys, onTogglePin }: Props) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((binding) => {
        const pinned = pinnedKeys.includes(binding.bindingKey);
        return (
          <li
            key={binding.bindingKey}
            className="group flex flex-col rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/20 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5"
          >
            <div className="flex items-start gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 shrink-0 p-0"
                aria-label={pinned ? `取消固定 ${binding.displayName}` : `固定 ${binding.displayName}`}
                aria-pressed={pinned}
                onClick={() => onTogglePin(binding.bindingKey)}
              >
                <Pin
                  className={cn("size-4", pinned ? "fill-current text-brand-500" : "text-gray-400")}
                  aria-hidden
                />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                  {binding.displayName}
                </p>
                <p className="mt-0.5 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                  {binding.analysisType}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Button type="button" variant="outline" size="sm" className="h-8 w-full sm:w-auto" asChild>
                <Link
                  to={prefabReportsRunPath(binding.bindingKey)}
                  aria-label={`运行 ${binding.displayName}`}
                >
                  <Play className="size-3.5" aria-hidden />
                  运行
                </Link>
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
