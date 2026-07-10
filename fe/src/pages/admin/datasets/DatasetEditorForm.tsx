import { Database, FunctionSquare, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComputedFieldsEditor } from "./ComputedFieldsEditor";
import { DatasetTablePicker } from "./DatasetTablePicker";
import type { DatasetEditorValues } from "./types";

export function DatasetEditorForm({
  mode,
  values,
  onChange,
  onSubmit,
  isSaving,
}: {
  mode: "create" | "edit";
  values: DatasetEditorValues;
  onChange: (next: DatasetEditorValues) => void;
  onSubmit: () => void;
  isSaving: boolean;
}) {
  const canSubmit =
    values.datasetId.trim().length > 0 &&
    values.displayName.trim().length > 0 &&
    values.tables.length > 0 &&
    values.computedFields.every((f) => f.name.trim() && f.expression.trim());

  return (
    <form
      className="grid gap-6 p-6 lg:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Card variant="outlined" elevation={1}>
        <CardHeader className="px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              <Layers3 className="size-5" aria-hidden />
            </span>
            <div className="grid gap-1">
              <CardTitle className="text-theme-sm">基本信息</CardTitle>
              <CardDescription>Dataset 在列表与绑定配置中的展示标识。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
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
            <div className="grid gap-2">
              <Label htmlFor="edit-name">显示名</Label>
              <Input
                id="edit-name"
                value={values.displayName}
                onChange={(e) => onChange({ ...values, displayName: e.target.value })}
                className="h-11"
              />
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                ID：<code className="font-mono">{values.datasetId}</code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" elevation={1}>
        <CardHeader className="px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              <Database className="size-5" aria-hidden />
            </span>
            <div className="grid gap-1">
              <CardTitle className="text-theme-sm">数据表</CardTitle>
              <CardDescription>
                从数据源 Schema 浏览并添加表；已选 {values.tables.length} 张。
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <DatasetTablePicker
            tables={values.tables}
            onChange={(tables) => onChange({ ...values, tables })}
          />
        </CardContent>
      </Card>

      <Card variant="outlined" elevation={1}>
        <CardHeader className="px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              <FunctionSquare className="size-5" aria-hidden />
            </span>
            <div className="grid gap-1">
              <CardTitle className="text-theme-sm">计算字段</CardTitle>
              <CardDescription>基于物理列编写表达式，供图表与查询服务引用。</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ComputedFieldsEditor
            fields={values.computedFields}
            onChange={(computedFields) => onChange({ ...values, computedFields })}
          />
        </CardContent>
      </Card>

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
  );
}
