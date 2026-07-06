import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LayoutWidget } from "./layoutUtils";

type DataSourceListItem = { id: string; name: string; code: string };

type WidgetSqlPanelProps = {
  widget: LayoutWidget;
  onChange: (chartConfig: ChartViewConfig) => void;
};

export function WidgetSqlPanel({ widget, onChange }: WidgetSqlPanelProps) {
  const { data } = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: DataSourceListItem[] }>("/api/v1/datasources"),
  });
  const cfg = widget.chartConfig;
  const dsMissing = !cfg.dataSourceId;

  return (
    <div className="space-y-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="light">{cfg.chartType}</Badge>
        {dsMissing ? <span className="text-theme-xs text-error-500">请选择数据源</span> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`ds-${widget.id}`}>数据源</Label>
        <Select
          value={cfg.dataSourceId || undefined}
          onValueChange={(dataSourceId) => onChange({ ...cfg, dataSourceId })}
        >
          <SelectTrigger id={`ds-${widget.id}`} className="h-9">
            <SelectValue placeholder="选择数据源" />
          </SelectTrigger>
          <SelectContent>
            {(data?.items ?? []).map((ds) => (
              <SelectItem key={ds.id} value={ds.id}>
                {ds.name} ({ds.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`sql-${widget.id}`}>SQL</Label>
        <textarea
          id={`sql-${widget.id}`}
          value={cfg.sql ?? ""}
          onChange={(e) => onChange({ ...cfg, sql: e.target.value })}
          rows={4}
          className={cn(
            "w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 font-mono text-theme-sm text-gray-800 dark:border-gray-700 dark:text-white/90",
          )}
        />
      </div>
    </div>
  );
}
