import { Button } from "@/components/ui/button";
import type { ChartTypeL1 } from "@/lib/chartViewConfig";

const LABELS: Record<ChartTypeL1, string> = {
  table: "表格",
  line: "折线图",
  bar: "柱状图",
};

type WidgetPaletteProps = {
  onInsert: (type: ChartTypeL1) => void;
};

export function WidgetPalette({ onInsert }: WidgetPaletteProps) {
  return (
    <aside className="w-full space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] lg:w-64">
      <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">添加组件</p>
      {(Object.keys(LABELS) as ChartTypeL1[]).map((type) => (
        <Button key={type} type="button" variant="outline" className="w-full justify-start" onClick={() => onInsert(type)}>
          {LABELS[type]}
        </Button>
      ))}
    </aside>
  );
}
