import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ComputedFieldsEditor } from "./ComputedFieldsEditor";
import { DatasetTablePicker } from "./DatasetTablePicker";
import type { DatasetEditorValues } from "./types";

function DatasetFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-3", className)}>
      <div>
        <h3 className="text-theme-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DatasetEditorForm({
  mode,
  values,
  onChange,
  onSubmit,
  isSaving,
  submitDisabled = false,
  bindPanel,
  tablePickerPrefill,
}: {
  mode: "create" | "edit";
  values: DatasetEditorValues;
  onChange: (next: DatasetEditorValues) => void;
  onSubmit: () => void;
  isSaving: boolean;
  submitDisabled?: boolean;
  bindPanel?: ReactNode;
  tablePickerPrefill?: {
    preferredDataSourceId?: string;
    prefillTable?: string;
    savedDataSourceId?: string;
    onDataSourceIdChange?: (dataSourceId: string) => void;
  };
}) {
  const canSubmit =
    values.datasetId.trim().length > 0 &&
    values.displayName.trim().length > 0 &&
    values.tables.length > 0 &&
    values.computedFields.every((f) => f.name.trim() && f.expression.trim());

  const tableTabLabel = `数据表${values.tables.length > 0 ? ` (${values.tables.length})` : ""}`;
  const computedTabLabel = `计算字段${values.computedFields.length > 0 ? ` (${values.computedFields.length})` : ""}`;

  return (
    <Card className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <CardHeader className="shrink-0 border-b border-gray-100 pb-4 dark:border-gray-800">
        {mode === "create" ? (
          <>
            <CardTitle>Dataset 配置</CardTitle>
            <CardDescription>
              从数据源选择物理表并定义计算字段，供报表与仪表板复用。
            </CardDescription>
          </>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-0 flex-1 gap-1.5 sm:max-w-md">
              <Label htmlFor="edit-name" className="text-theme-xs text-gray-600 dark:text-gray-400">
                显示名
              </Label>
              <Input
                id="edit-name"
                value={values.displayName}
                onChange={(e) => onChange({ ...values, displayName: e.target.value })}
                className="h-11"
              />
            </div>
            <Badge variant="light" color="light" size="sm" className="mb-0.5 font-mono">
              {values.datasetId}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {mode === "create" ? (
            <div className="shrink-0 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <DatasetFormSection
                title="基本信息"
                description="Dataset 在列表与绑定配置中的展示标识。"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="ds-id">Dataset ID</Label>
                    <Input
                      id="ds-id"
                      value={values.datasetId}
                      onChange={(e) => onChange({ ...values, datasetId: e.target.value })}
                      placeholder="ds-orders"
                      className="h-11 font-mono"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ds-name">显示名</Label>
                    <Input
                      id="ds-name"
                      value={values.displayName}
                      onChange={(e) => onChange({ ...values, displayName: e.target.value })}
                      placeholder="订单分析集"
                      className="h-11"
                    />
                  </div>
                </div>
              </DatasetFormSection>
            </div>
          ) : null}

          <Tabs defaultValue="tables" className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-gray-100 px-6 py-3 dark:border-gray-800">
              <TabsList variant="enclosed" size="sm" className="w-fit">
                <TabsTrigger value="tables">{tableTabLabel}</TabsTrigger>
                <TabsTrigger value="computed">{computedTabLabel}</TabsTrigger>
                {bindPanel ? <TabsTrigger value="bind">绑定配置</TabsTrigger> : null}
              </TabsList>
            </div>

            <TabsContent
              value="tables"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4 data-[state=inactive]:hidden"
            >
              <DatasetTablePicker
                tables={values.tables}
                onChange={(tables) => onChange({ ...values, tables })}
                preferredDataSourceId={tablePickerPrefill?.preferredDataSourceId}
                prefillTable={tablePickerPrefill?.prefillTable}
                savedDataSourceId={tablePickerPrefill?.savedDataSourceId}
                onDataSourceIdChange={tablePickerPrefill?.onDataSourceIdChange}
              />
            </TabsContent>

            <TabsContent
              value="computed"
              className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4 data-[state=inactive]:hidden"
            >
              <DatasetFormSection
                title="计算字段"
                description="基于物理列编写表达式，供图表与查询服务引用。"
              >
                <ComputedFieldsEditor
                  fields={values.computedFields}
                  onChange={(computedFields) => onChange({ ...values, computedFields })}
                />
              </DatasetFormSection>
            </TabsContent>

            {bindPanel ? (
              <TabsContent
                value="bind"
                className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4 data-[state=inactive]:hidden"
              >
                {bindPanel}
              </TabsContent>
            ) : null}
          </Tabs>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-3 dark:border-gray-800 dark:bg-gray-900/40">
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmit || isSaving || submitDisabled}
              loading={isSaving}
              loadingText="保存中…"
            >
              {mode === "create" ? "创建 Dataset" : "保存"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
