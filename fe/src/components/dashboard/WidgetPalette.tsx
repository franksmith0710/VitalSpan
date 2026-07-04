import { Button } from "@/components/ui/button";

const BASIC_CHART_TYPES = ["table", "line", "bar"] as const;
type BasicChartType = (typeof BASIC_CHART_TYPES)[number];

const LABELS: Record<BasicChartType, string> = {
  table: "表格",
  line: "折线图",
  bar: "柱状图",
};

type WidgetPaletteProps = {
  onInsert: (type: BasicChartType) => void;
};

export function WidgetPalette({ onInsert }: WidgetPaletteProps) {
  return (
    <aside className="w-full space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] lg:w-64">
      <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">添加组件</p>
      {BASIC_CHART_TYPES.map((type) => (
        <Button key={type} type="button" variant="outline" className="w-full justify-start" onClick={() => onInsert(type)}>
          {LABELS[type]}
        </Button>
      ))}
    </aside>
  );
}
