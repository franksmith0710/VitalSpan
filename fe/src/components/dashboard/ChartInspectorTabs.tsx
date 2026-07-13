import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ChartInspectorTabsProps = {
  data: ReactNode;
  style: ReactNode;
  advanced: ReactNode;
  dataFooter?: ReactNode;
  defaultTab?: "data" | "style" | "advanced";
  className?: string;
};

export function ChartInspectorTabs({
  data,
  style,
  advanced,
  dataFooter,
  defaultTab = "data",
  className,
}: ChartInspectorTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className={cn("flex min-h-0 flex-col", className)}>
      <TabsList className="mx-3 mt-2 grid w-[calc(100%-1.5rem)] shrink-0 grid-cols-3">
        <TabsTrigger value="data" className="text-theme-xs">
          数据
        </TabsTrigger>
        <TabsTrigger value="style" className="text-theme-xs">
          样式
        </TabsTrigger>
        <TabsTrigger value="advanced" className="text-theme-xs">
          高级
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="data"
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{data}</div>
        {dataFooter}
      </TabsContent>
      <TabsContent
        value="style"
        className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-3 data-[state=inactive]:hidden"
      >
        {style}
      </TabsContent>
      <TabsContent
        value="advanced"
        className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 py-3 data-[state=inactive]:hidden"
      >
        {advanced}
      </TabsContent>
    </Tabs>
  );
}
