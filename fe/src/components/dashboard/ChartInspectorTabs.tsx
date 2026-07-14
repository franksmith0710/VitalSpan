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
      <TabsList
        variant="enclosed"
        size="sm"
        className="mx-2 mt-1.5 grid h-8 w-[calc(100%-1rem)] shrink-0 grid-cols-3 rounded-md p-0.5"
      >
        <TabsTrigger variant="enclosed" size="sm" value="data" className="h-7 px-1 text-[11px]">
          数据
        </TabsTrigger>
        <TabsTrigger variant="enclosed" size="sm" value="style" className="h-7 px-1 text-[11px]">
          样式
        </TabsTrigger>
        <TabsTrigger variant="enclosed" size="sm" value="advanced" className="h-7 px-1 text-[11px]">
          高级
        </TabsTrigger>
      </TabsList>
      <TabsContent
        value="data"
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">{data}</div>
        {dataFooter}
      </TabsContent>
      <TabsContent
        value="style"
        className="mt-0 min-h-0 flex-1 overflow-y-auto px-2 py-2 data-[state=inactive]:hidden"
      >
        {style}
      </TabsContent>
      <TabsContent
        value="advanced"
        className="mt-0 min-h-0 flex-1 overflow-y-auto px-2 py-2 data-[state=inactive]:hidden"
      >
        {advanced}
      </TabsContent>
    </Tabs>
  );
}
