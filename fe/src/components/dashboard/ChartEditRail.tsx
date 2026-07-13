import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import type { LayoutWidget } from "./layoutUtils";
import { ChartInspectorProvider } from "./ChartInspectorContext";
import { ChartEditorColumn } from "./ChartEditorColumn";
import { DatasetFieldBank, FieldBankPlaceholder } from "./DatasetFieldBank";

type ChartEditRailProps = {
  widget: LayoutWidget;
  onChange: (chartConfig: ChartViewConfig) => void;
  onDelete?: () => void;
  className?: string;
};

/** DataEase chart-edit：配置列 + 字段库双列 */
export function ChartEditRail({ widget, onChange, onDelete, className }: ChartEditRailProps) {
  return (
    <ChartInspectorProvider widget={widget} onChange={onChange}>
      <div
        className={cn(
          "grid h-full min-h-0 grid-cols-[minmax(220px,1fr)_minmax(140px,168px)]",
          className,
        )}
      >
        <ChartEditorColumn
          onDelete={onDelete}
          className="border-r border-gray-200 dark:border-gray-800"
        />
        <DatasetFieldBank />
      </div>
    </ChartInspectorProvider>
  );
}

export function ChartEditRailEmpty({ message, className }: { message: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center px-4 py-10 text-center",
        className,
      )}
    >
      {message}
    </div>
  );
}

export { FieldBankPlaceholder };
