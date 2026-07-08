import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ConnectorCategoryCardProps = {
  label: string;
  description: string;
  count: number;
  icon: LucideIcon;
  selected?: boolean;
  onSelect: () => void;
};

export function ConnectorCategoryCard({
  label,
  description,
  count,
  icon: Icon,
  selected,
  onSelect,
}: ConnectorCategoryCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`${label}，${count} 种连接器`}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "cursor-pointer rounded-xl border border-gray-200 bg-white shadow-theme-sm transition-colors hover:border-brand-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/40",
        selected && "border-brand-500 ring-2 ring-brand-500/20",
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Icon className="size-6 text-brand-500" aria-hidden />
        <CardTitle className="text-theme-xl font-semibold">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">{description}</p>
        {count > 0 ? <p className="mt-2 text-theme-xs text-gray-400">{count} 种连接器</p> : null}
      </CardContent>
    </Card>
  );
}
