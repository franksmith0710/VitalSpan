import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DatasetComputedField } from "./types";

export function ComputedFieldsEditor({
  fields,
  onChange,
}: {
  fields: DatasetComputedField[];
  onChange: (next: DatasetComputedField[]) => void;
}) {
  const update = (index: number, patch: Partial<DatasetComputedField>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const remove = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...fields, { name: "", expression: "" }]);
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>计算字段</Label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" aria-hidden />
          添加
        </Button>
      </div>
      {fields.length === 0 ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">暂无计算字段，可添加 name + expression。</p>
      ) : (
        <div className="grid gap-2">
          {fields.map((field, index) => (
            <div
              key={`cf-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-end gap-2"
            >
              <div className="grid gap-1">
                <Label htmlFor={`cf-name-${index}`} className="text-theme-xs text-gray-500">
                  名称
                </Label>
                <Input
                  id={`cf-name-${index}`}
                  value={field.name}
                  placeholder="amt2"
                  onChange={(e) => update(index, { name: e.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`cf-expr-${index}`} className="text-theme-xs text-gray-500">
                  表达式
                </Label>
                <Input
                  id={`cf-expr-${index}`}
                  value={field.expression}
                  placeholder="amount * 2"
                  className="font-mono text-theme-xs"
                  onChange={(e) => update(index, { expression: e.target.value })}
                />
              </div>
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`删除计算字段 ${field.name || index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
