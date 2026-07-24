import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComputedFieldsEditor } from "./ComputedFieldsEditor";
import { DatasetTablePicker } from "./DatasetTablePicker";
import type { DatasetEditorValues } from "./types";

function DatasetFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-b border-gray-100 pb-6 last:border-b-0 dark:border-gray-800">
      <div>
        <h3 className="text-theme-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{description}</p>
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
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{mode === "create" ? "Dataset 配置" : values.displayName || "未命名 Dataset"}</CardTitle>
          {mode === "edit" ? (
            <Badge variant="light" color="light" size="sm" className="font-mono">
              {values.datasetId}
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          从数据源选择物理表并定义计算字段，供报表与仪表板复用。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <DatasetFormSection
            title="基本信息"
            description="Dataset 在列表与绑定配置中的展示标识。"
          >
            {mode === "create" ? (
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
            ) : (
              <div className="grid max-w-xl gap-2">
                <Label htmlFor="edit-name">显示名</Label>
                <Input
                  id="edit-name"
                  value={values.displayName}
                  onChange={(e) => onChange({ ...values, displayName: e.target.value })}
                  className="h-11"
                />
              </div>
            )}
          </DatasetFormSection>

          <DatasetFormSection
            title="数据表"
            description={`从数据源 Schema 浏览并添加表；已选 ${values.tables.length} 张。`}
          >
            <DatasetTablePicker
              tables={values.tables}
              onChange={(tables) => onChange({ ...values, tables })}
            />
          </DatasetFormSection>

          <DatasetFormSection
            title="计算字段"
            description="基于物理列编写表达式，供图表与查询服务引用。"
          >
            <ComputedFieldsEditor
              fields={values.computedFields}
              onChange={(computedFields) => onChange({ ...values, computedFields })}
            />
          </DatasetFormSection>

          {bindPanel}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
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
