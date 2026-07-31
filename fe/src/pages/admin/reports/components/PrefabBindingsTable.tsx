import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TruncateHint } from "@/components/ui/hint-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PrefabBinding } from "../usePrefabReports";

const ANALYSIS_LABELS: Record<string, string> = {
  lifecycle: "生命周期",
  activity: "活跃度",
  trend: "趋势",
  distribution: "分布",
};

function analysisLabel(type: string): string {
  return ANALYSIS_LABELS[type] ?? type;
}

type PrefabBindingsTableProps = {
  bindings: PrefabBinding[];
  runningKey: string | null;
  onRun: (bindingKey: string) => void;
};

export function PrefabBindingsTable({ bindings, runningKey, onRun }: PrefabBindingsTableProps) {
  return (
    <div className="overflow-x-only">
      <Table className="min-w-[640px] text-theme-sm">
        <TableHeader>
          <TableRow className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">报表名称</TableHead>
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">分析类型</TableHead>
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">实体类型</TableHead>
            <TableHead className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bindings.map((binding) => {
            const isRunning = runningKey === binding.bindingKey;
            return (
              <TableRow key={binding.bindingKey} className="border-gray-100 dark:border-gray-800">
                <TableCell className="px-4 py-3">
                  <TruncateHint
                    title={binding.displayName}
                    as="span"
                    className="font-medium text-gray-800 dark:text-white/90"
                  >
                    {binding.displayName}
                  </TruncateHint>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Badge variant="light" color="primary" size="sm">
                    {analysisLabel(binding.analysisType)}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <span className="font-mono text-theme-xs text-gray-600 dark:text-gray-400">
                    {binding.entityTypeCode}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={isRunning ? "outline" : "primary"}
                    disabled={isRunning}
                    aria-label={`运行报表 ${binding.displayName}`}
                    onClick={() => onRun(binding.bindingKey)}
                  >
                    <Play className="size-3.5" aria-hidden />
                    {isRunning ? "运行中…" : "运行"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
