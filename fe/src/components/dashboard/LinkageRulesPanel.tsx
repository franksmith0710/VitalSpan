import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Linkage } from "./dashboardFilterUtils";
import type { LayoutWidget } from "./layoutUtils";

type LinkageRule = Linkage["linkageRules"][number];

type LinkageRulesPanelProps = {
  dashboardId: string;
  linkage: Linkage | null;
  widgets: LayoutWidget[];
  onSaved: (linkage: Linkage) => void;
};

const EMPTY_RULE = {
  sourceFilterId: "",
  targetWidgetIds: [] as string[],
  parameterKey: "",
};

export function LinkageRulesPanel({ dashboardId, linkage, widgets, onSaved }: LinkageRulesPanelProps) {
  const [rules, setRules] = useState<LinkageRule[]>([]);
  const [draft, setDraft] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRules(linkage?.linkageRules ?? []);
  }, [linkage]);

  const filters = linkage?.filters ?? [];
  const canAdd =
    draft.sourceFilterId &&
    draft.parameterKey.trim() &&
    draft.targetWidgetIds.length > 0;

  const handleAddRule = () => {
    if (!canAdd) return;
    setRules((prev) => [
      ...prev,
      {
        sourceFilterId: draft.sourceFilterId,
        targetWidgetIds: [...draft.targetWidgetIds],
        parameterKey: draft.parameterKey.trim(),
      },
    ]);
    setDraft(EMPTY_RULE);
    setError(null);
  };

  const handleRemoveRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTarget = (widgetId: string, checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      targetWidgetIds: checked
        ? [...prev.targetWidgetIds, widgetId]
        : prev.targetWidgetIds.filter((id) => id !== widgetId),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        dashboardId,
        filters: linkage?.filters ?? [],
        linkageRules: rules,
        refreshMode: linkage?.refreshMode ?? "eager",
      };
      const saved = await apiFetch<Linkage & { affectedWidgetCount?: number }>(
        `/api/v1/dashboards/${dashboardId}/global-filters`,
        { method: "PUT", body: JSON.stringify(payload) },
      );
      onSaved({
        filters: saved.filters ?? payload.filters,
        linkageRules: saved.linkageRules ?? rules,
        refreshMode: saved.refreshMode ?? payload.refreshMode,
      });
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!filters.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-4 py-3 text-theme-xs text-gray-500 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400">
        暂无全局筛选器，请先在后台配置 filters 后再添加联动规则。
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">组件联动规则</h3>
        <Button type="button" variant="primary" size="sm" disabled={saving} onClick={() => void handleSave()}>
          {saving ? "保存中…" : "保存联动"}
        </Button>
      </div>
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        筛选器值通过 parameterKey 注入目标组件 SQL 的 {`{{key}}`} 占位符。
      </p>

      {rules.length > 0 ? (
        <ul className="space-y-2">
          {rules.map((rule, index) => {
            const filterLabel =
              filters.find((f) => f.filterId === rule.sourceFilterId)?.dimensionRef ?? rule.sourceFilterId;
            const targets = rule.targetWidgetIds
              .map((id) => widgets.find((w) => w.id === id)?.title ?? id)
              .join("、");
            return (
              <li
                key={`${rule.sourceFilterId}-${rule.parameterKey}-${index}`}
                className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <p className="min-w-0 flex-1 text-theme-xs text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{filterLabel}</span>
                  {" → "}
                  <span>{targets || "—"}</span>
                  {" · "}
                  <code className="rounded bg-gray-200/80 px-1 dark:bg-white/10">{rule.parameterKey}</code>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-7 shrink-0 text-gray-400 hover:text-error-600"
                  aria-label="删除规则"
                  onClick={() => handleRemoveRule(index)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-theme-xs text-gray-400">尚未配置联动规则。</p>
      )}

      <div className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <p className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">添加规则</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="linkage-source-filter">源筛选器</Label>
            <Select
              value={draft.sourceFilterId}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, sourceFilterId: value }))}
            >
              <SelectTrigger id="linkage-source-filter" className="h-9">
                <SelectValue placeholder="选择筛选器" />
              </SelectTrigger>
              <SelectContent>
                {filters.map((f) => (
                  <SelectItem key={f.filterId} value={f.filterId}>
                    {f.dimensionRef}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="linkage-param-key">参数键 parameterKey</Label>
            <Input
              id="linkage-param-key"
              className="h-9"
              placeholder="如 region"
              value={draft.parameterKey}
              onChange={(e) => setDraft((prev) => ({ ...prev, parameterKey: e.target.value }))}
            />
          </div>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">目标组件</legend>
          <div className="flex flex-wrap gap-3">
            {widgets.map((w) => (
              <label key={w.id} className="flex cursor-pointer items-center gap-2 text-theme-xs text-gray-700 dark:text-gray-300">
                <Checkbox
                  checked={draft.targetWidgetIds.includes(w.id)}
                  onCheckedChange={(checked) => toggleTarget(w.id, checked === true)}
                />
                {w.title}
              </label>
            ))}
          </div>
        </fieldset>
        <Button type="button" variant="outline" size="sm" disabled={!canAdd} onClick={handleAddRule}>
          <Plus className="size-4" aria-hidden />
          添加规则
        </Button>
      </div>

      {error ? <p className="text-theme-xs text-error-600 dark:text-error-400">{error}</p> : null}
    </div>
  );
}
