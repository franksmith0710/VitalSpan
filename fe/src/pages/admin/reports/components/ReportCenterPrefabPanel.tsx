import { Link } from "react-router";
import { BarChart3, Pin, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";
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
  if (items.length === 0) {
    return (
      <PanelEmptyState
        layout="inline"
        variant="plain"
        size="sm"
        icon={<BarChart3 className="size-5" aria-hidden />}
        title="暂无预制分析"
        description="管理员配置绑定后，可在此一键运行。"
        action={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin/reports">前往预制报表</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      {items.map((binding) => {
        const pinned = pinnedKeys.includes(binding.bindingKey);
        return (
          <li key={binding.bindingKey} className="flex items-center gap-2.5 py-3 first:pt-0 last:pb-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-8 shrink-0 p-0"
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
              <p className="truncate text-theme-xs text-gray-500">{binding.analysisType}</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="shrink-0" asChild>
              <Link to={prefabReportsRunPath(binding.bindingKey)} aria-label={`运行 ${binding.displayName}`}>
                <Play className="size-3.5" aria-hidden />
                运行
              </Link>
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
