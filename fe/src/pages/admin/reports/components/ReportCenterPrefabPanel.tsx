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
    <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((binding) => {
        const pinned = pinnedKeys.includes(binding.bindingKey);
        return (
          <li
            key={binding.bindingKey}
            className="flex items-center gap-2 rounded-md bg-gray-50/80 px-2 py-1.5 dark:bg-white/[0.03]"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-7 shrink-0 p-0"
              aria-label={pinned ? `取消固定 ${binding.displayName}` : `固定 ${binding.displayName}`}
              aria-pressed={pinned}
              onClick={() => onTogglePin(binding.bindingKey)}
            >
              <Pin className={cn("size-3.5", pinned ? "fill-current text-brand-500" : "text-gray-400")} aria-hidden />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {binding.displayName}
              </p>
              <p className="truncate text-[10px] text-gray-500">{binding.analysisType}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 px-2" asChild>
              <Link to={prefabReportsRunPath(binding.bindingKey)} aria-label={`运行 ${binding.displayName}`}>
                <Play className="size-3" aria-hidden />
                运行
              </Link>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
