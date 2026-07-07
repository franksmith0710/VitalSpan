import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EtlRule = {
  type: string;
  [key: string]: string;
};

const RULE_TYPES = [
  { value: "rename_column", label: "列重命名" },
  { value: "cast_type", label: "类型转换" },
  { value: "fill_null", label: "空值填充" },
  { value: "filter_rows", label: "行过滤" },
];

const PLACEHOLDER_HINT =
  "推荐链：product_name→product、amount→float、note 填「无备注」、过滤 status≠deleted";

function emptyRule(type = "rename_column"): EtlRule {
  if (type === "rename_column") return { type, from: "", to: "" };
  if (type === "cast_type") return { type, column: "", to: "float" };
  if (type === "fill_null") return { type, column: "", value: "" };
  return { type, column: "", op: "ne", value: "" };
}

export function EtlRulesPage() {
  const { id } = useParams();
  const [rules, setRules] = useState<EtlRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(false);

  const loadRules = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setFieldErrors(false);
    try {
      const data = await apiFetch<{ rules: EtlRule[] }>(
        `/api/v1/ingestion/sync-jobs/${id}/etl-rules`,
      );
      setRules(data.rules.length > 0 ? data.rules : [emptyRule()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const updateRule = (index: number, key: string, value: string) => {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, [key]: value } : rule)),
    );
    setSaved(false);
  };

  const changeRuleType = (index: number, type: string) => {
    setRules((prev) => prev.map((rule, i) => (i === index ? emptyRule(type) : rule)));
    setSaved(false);
  };

  const addRule = () => {
    setRules((prev) => [...prev, emptyRule()]);
    setSaved(false);
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!id) return;
    if (saving) return;
    for (const rule of rules) {
      if (
        rule.type === "rename_column" &&
        (!(rule.from?.trim()) || !(rule.to?.trim()))
      ) {
        setFieldErrors(true);
        setError("请填写完整的列重命名规则");
        return;
      }
      if (
        (rule.type === "cast_type" ||
          rule.type === "fill_null" ||
          rule.type === "filter_rows") &&
        !(rule.column?.trim())
      ) {
        setFieldErrors(true);
        setError("请填写规则涉及的列名");
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/v1/ingestion/sync-jobs/${id}/etl-rules`, {
        method: "PUT",
        body: JSON.stringify({ rules }),
      });
      setFieldErrors(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-theme-xl font-semibold text-gray-900 dark:text-white">清洗规则</h1>
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">{PLACEHOLDER_HINT}</p>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-error-500 bg-error-50 p-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
        >
          {error}
        </div>
      ) : null}

      {saved ? (
        <div className="rounded-xl border border-success-500 bg-success-50 p-4 text-theme-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400">
          规则已保存
        </div>
      ) : null}

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        {rules.map((rule, index) => (
          <div
            key={index}
            className="space-y-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Label>规则类型</Label>
                <Select value={rule.type} onValueChange={(v) => changeRuleType(index, v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                aria-label="删除规则"
                onClick={() => removeRule(index)}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </div>

            {rule.type === "rename_column" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>源列名</Label>
                  <Input
                    value={rule.from ?? ""}
                    placeholder="product_name"
                    aria-invalid={fieldErrors && !rule.from?.trim() ? true : undefined}
                    onChange={(e) => updateRule(index, "from", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>目标列名</Label>
                  <Input
                    value={rule.to ?? ""}
                    placeholder="product"
                    aria-invalid={fieldErrors && !rule.to?.trim() ? true : undefined}
                    onChange={(e) => updateRule(index, "to", e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {rule.type === "cast_type" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>列名</Label>
                  <Input
                    value={rule.column ?? ""}
                    placeholder="amount"
                    aria-invalid={fieldErrors && !rule.column?.trim() ? true : undefined}
                    onChange={(e) => updateRule(index, "column", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>目标类型</Label>
                  <Select value={rule.to ?? "float"} onValueChange={(v) => updateRule(index, "to", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="float">float</SelectItem>
                      <SelectItem value="integer">integer</SelectItem>
                      <SelectItem value="boolean">boolean</SelectItem>
                      <SelectItem value="string">string</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {rule.type === "fill_null" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>列名</Label>
                  <Input
                    value={rule.column ?? ""}
                    placeholder="note"
                    aria-invalid={fieldErrors && !rule.column?.trim() ? true : undefined}
                    onChange={(e) => updateRule(index, "column", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>填充值</Label>
                  <Input
                    value={rule.value ?? ""}
                    placeholder="无备注"
                    onChange={(e) => updateRule(index, "value", e.target.value)}
                  />
                </div>
              </div>
            ) : null}

            {rule.type === "filter_rows" ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>列名</Label>
                  <Input
                    value={rule.column ?? ""}
                    placeholder="status"
                    aria-invalid={fieldErrors && !rule.column?.trim() ? true : undefined}
                    onChange={(e) => updateRule(index, "column", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>操作符</Label>
                  <Select value={rule.op ?? "ne"} onValueChange={(v) => updateRule(index, "op", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eq">等于</SelectItem>
                      <SelectItem value="ne">不等于</SelectItem>
                      <SelectItem value="is_null">为空</SelectItem>
                      <SelectItem value="is_not_null">非空</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>比较值</Label>
                  <Input
                    value={rule.value ?? ""}
                    placeholder="deleted"
                    onChange={(e) => updateRule(index, "value", e.target.value)}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ))}

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={addRule}>
            <Plus className="size-4" />
            添加规则
          </Button>
          <Button type="button" variant="primary" loading={saving} onClick={() => void handleSave()}>
            保存规则
          </Button>
        </div>
      </div>
    </div>
  );
}
