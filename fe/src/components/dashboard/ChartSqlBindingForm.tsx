import { Link } from "react-router";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DataSourceListItem = { id: string; name: string; code: string };

const EMPTY_DATASOURCE_VALUE = "__empty_datasources__";

type ChartSqlBindingFormProps = {
  widgetId: string;
  cfg: ChartViewConfig;
  dsLoading: boolean;
  datasourceItems: DataSourceListItem[];
  datasourcesEmpty: boolean;
  onChange: (chartConfig: ChartViewConfig) => void;
};

/** 右侧栏 SQL 模式：数据源 + SQL 编辑器 */
export function ChartSqlBindingForm({
  widgetId,
  cfg,
  dsLoading,
  datasourceItems,
  datasourcesEmpty,
  onChange,
}: ChartSqlBindingFormProps) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor={`ds-${widgetId}`}>数据源</Label>
        <Select
          value={cfg.dataSourceId || undefined}
          onValueChange={(dataSourceId) => onChange({ ...cfg, dataSourceId })}
        >
          <SelectTrigger id={`ds-${widgetId}`} className="h-10">
            <SelectValue placeholder={dsLoading ? "加载中…" : "选择数据源"} />
          </SelectTrigger>
          <SelectContent>
            {dsLoading ? (
              <SelectItem value={EMPTY_DATASOURCE_VALUE} disabled className="text-gray-500">
                加载中…
              </SelectItem>
            ) : datasourcesEmpty ? (
              <SelectItem value={EMPTY_DATASOURCE_VALUE} disabled className="text-gray-500">
                暂无数据源
              </SelectItem>
            ) : (
              datasourceItems.map((ds) => (
                <SelectItem key={ds.id} value={ds.id}>
                  {ds.name} ({ds.code})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {datasourcesEmpty ? (
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            请先在{" "}
            <Link to="/admin/datasources" className="underline text-brand-600 dark:text-brand-400">
              数据源管理
            </Link>{" "}
            中创建连接。
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`sql-${widgetId}`}>SQL</Label>
        <textarea
          id={`sql-${widgetId}`}
          value={cfg.sql ?? ""}
          onChange={(e) => onChange({ ...cfg, mode: "sql", sql: e.target.value })}
          rows={5}
          placeholder="SELECT ..."
          className={cn(
            "w-full resize-y rounded-lg border border-gray-300 bg-transparent px-3 py-2 font-mono text-theme-xs text-gray-800",
            "focus-visible:border-brand-300 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/10",
            "dark:border-gray-700 dark:text-white/90",
          )}
        />
      </div>
    </div>
  );
}
