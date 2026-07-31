import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <section
      className={cn(
        "grid gap-3 border-b border-gray-100 pb-5 last:border-b-0 dark:border-gray-800",
        className,
      )}
    >
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
  bindPanel,
}: {
  mode: "create" | "edit";
  values: DatasetEditorValues;
  onChange: (next: DatasetEditorValues) => void;
  onSubmit: () => void;
  isSaving: boolean;
  bindPanel?: ReactNode;
}) {
  const canSubmit =
    values.datasetId.trim().length > 0 &&
    values.displayName.trim().length > 0 &&
    values.tables.length > 0 &&
    values.computedFields.every((f) => f.name.trim() && f.expression.trim());

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
          <div className="grid gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid min-w-0 flex-1 gap-1.5 sm:max-w-md">
                <Label htmlFor="edit-name" className="text-theme-xs text-gray-600 dark:text-gray-400">
                  显示名
                </Label>
                <Input
                  id="edit-name"
                  value={values.displayName}
                  onChange={(e) => onChange({ ...values, displayName: e.target.value })}
                  className="h-10"
                />
              </div>
              <Badge variant="light" color="light" size="sm" className="font-mono">
                {values.datasetId}
              </Badge>
            </div>
            <CardDescription className="mt-0">
              从数据源选择物理表并定义计算字段，供报表与仪表板复用。
            </CardDescription>
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
                className="border-b-0 pb-0"
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

          <div className="flex min-h-0 flex-1 flex-col px-6 py-4">
            <DatasetFormSection
              title="数据表"
              description={`从数据源 Schema 浏览并添加表；已选 ${values.tables.length} 张。`}
              className="flex min-h-0 flex-1 flex-col border-b-0 pb-0"
            >
              <DatasetTablePicker
                tables={values.tables}
                onChange={(tables) => onChange({ ...values, tables })}
              />
            </DatasetFormSection>
          </div>

          <div className="custom-scrollbar shrink-0 overflow-y-auto border-t border-gray-100 px-6 py-4 dark:border-gray-800 max-h-[min(38vh,360px)]">
            <div className="grid gap-5">
              <DatasetFormSection
                title="计算字段"
                description="基于物理列编写表达式，供图表与查询服务引用。"
                className="border-b-0 pb-0"
              >
                <ComputedFieldsEditor
                  fields={values.computedFields}
                  onChange={(computedFields) => onChange({ ...values, computedFields })}
                />
              </DatasetFormSection>

              {bindPanel}
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white/95 px-6 py-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
            <Button
              type="submit"
              variant="primary"
              disabled={!canSubmit || isSaving}
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
