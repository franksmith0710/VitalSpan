import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComputedFieldsEditor } from "./ComputedFieldsEditor";
import { DatasetTablePicker } from "./DatasetTablePicker";
import type { DatasetEditorValues, DatasetItem } from "./types";

const EMPTY: DatasetEditorValues = {
  datasetId: "",
  displayName: "",
  tables: [],
  computedFields: [],
  allowedRoles: ["analyst"],
};

export function DatasetEditorDialog({
  open,
  mode,
  initial,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: DatasetItem | null;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DatasetEditorValues) => void;
}) {
  const [values, setValues] = useState<DatasetEditorValues>(EMPTY);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setValues({
        datasetId: initial.datasetId,
        displayName: initial.displayName,
        tables: initial.tables.map((t) => ({ ...t })),
        computedFields: initial.computedFields.map((c) => ({ ...c })),
        allowedRoles: [...initial.allowedRoles],
      });
    } else {
      setValues(EMPTY);
    }
  }, [open, mode, initial]);

  const canSubmit =
    values.datasetId.trim().length > 0 &&
    values.displayName.trim().length > 0 &&
    values.tables.length > 0 &&
    values.computedFields.every((f) => f.name.trim() && f.expression.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新建 Dataset" : "编辑 Dataset"}</DialogTitle>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto pr-1">
          {mode === "create" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="ds-id">Dataset ID</Label>
                <Input
                  id="ds-id"
                  value={values.datasetId}
                  onChange={(e) => setValues((v) => ({ ...v, datasetId: e.target.value }))}
                  placeholder="ds-orders"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ds-name">显示名</Label>
                <Input
                  id="ds-name"
                  value={values.displayName}
                  onChange={(e) => setValues((v) => ({ ...v, displayName: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="edit-name">显示名</Label>
              <Input
                id="edit-name"
                value={values.displayName}
                onChange={(e) => setValues((v) => ({ ...v, displayName: e.target.value }))}
              />
              <p className="text-theme-xs text-gray-500">
                ID：<code className="font-mono">{values.datasetId}</code>
              </p>
            </div>
          )}

          <DatasetTablePicker
            tables={values.tables}
            onChange={(tables) => setValues((v) => ({ ...v, tables }))}
          />

          <ComputedFieldsEditor
            fields={values.computedFields}
            onChange={(computedFields) => setValues((v) => ({ ...v, computedFields }))}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!canSubmit || pending}
            onClick={() =>
              onSubmit({
                ...values,
                datasetId: values.datasetId.trim(),
                displayName: values.displayName.trim(),
                computedFields: values.computedFields.map((f) => ({
                  name: f.name.trim(),
                  expression: f.expression.trim(),
                })),
              })
            }
          >
            {mode === "create" ? "创建" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
