import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeaderIcon, AdminPageShell } from "@/components/layout/admin-page-shell";
import { ADMIN_PAGE_SURFACE_CLASS } from "@/components/layout/list-page-kit";
import { cn } from "@/lib/utils";
import {
  ListPageBatchActions,
  ListRowCheckbox,
  useListBatchMode,
} from "@/components/layout/list-batch-delete";
import { useListRowSelection } from "@/hooks/useListRowSelection";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageErrorBanner } from "@/components/ui/page-error-banner";
import { UnsavedLeaveDialog } from "@/components/ui/unsaved-leave-dialog";
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

import {
  DIRTY_ORDERS_DEMO_ETL_RULES,
  DIRTY_ORDERS_DEMO_SOURCE_TABLE,
} from "./etlDemoTemplate";
import { EtlColumnField } from "./components/EtlColumnField";
import { useSyncJobSourceColumns } from "./hooks/useSyncJobSourceColumns";
import { suggestEtlRulesFromColumns, summarizeEtlRules } from "./etlRuleSuggest";

const etlRulesPageIcon = (
  <AdminPageHeaderIcon>
    <Settings2 className="size-6" aria-hidden />
  </AdminPageHeaderIcon>
);

function emptyRule(type = "rename_column"): EtlRule {
  if (type === "rename_column") return { type, from: "", to: "" };
  if (type === "cast_type") return { type, column: "", to: "float" };
  if (type === "fill_null") return { type, column: "", value: "" };
  return { type, column: "", op: "ne", value: "" };
}

function serializeRules(rules: EtlRule[]): string {
  return JSON.stringify(rules);
}

export function EtlRulesPage() {
  const { id } = useParams();
  const [rules, setRules] = useState<EtlRule[]>([]);
  const { sourceTable, columnNames, columns, columnsLoading, columnsReady, hasDataSource } =
    useSyncJobSourceColumns(id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState(false);

  const { isDirty, isBaselineReady, resetBaseline, markSaved } = useFormDirtyState(
    rules,
    serializeRules,
  );

  const leaveGuardEnabled = isBaselineReady && isDirty;
  const { leaveDialogOpen, confirmLeave, cancelLeave } = useUnsavedLeaveGuard({
    enabled: leaveGuardEnabled,
  });

  const rowIds = useMemo(() => rules.map((_, index) => String(index)), [rules]);
  const selection = useListRowSelection(rowIds);
  const batch = useListBatchMode(selection.clear);

  const removeSelectedRules = () => {
    const indices = new Set([...selection.selectedIds].map(Number));
    setRules((prev) => prev.filter((_, i) => !indices.has(i)));
    selection.clear();
  };

  const loadRules = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setFieldErrors(false);
    try {
      const rulesData = await apiFetch<{ rules: EtlRule[] }>(
        `/api/v1/ingestion/sync-jobs/${id}/etl-rules`,
      );
      const nextRules = rulesData.rules.length > 0 ? rulesData.rules : [emptyRule()];
      setRules(nextRules);
      resetBaseline(nextRules);
    } catch (err) {
      setError(mapApiError(err));
    } finally {
      setLoading(false);
    }
  }, [id, resetBaseline]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const updateRule = (index: number, key: string, value: string) => {
    setRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, [key]: value } : rule)),
    );
  };

  const changeRuleType = (index: number, type: string) => {
    setRules((prev) => prev.map((rule, i) => (i === index ? emptyRule(type) : rule)));
  };

  const addRule = () => {
    setRules((prev) => [...prev, emptyRule()]);
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (): Promise<boolean> => {
    if (!id) return false;
    if (saving) return false;
    for (const rule of rules) {
      if (
        rule.type === "rename_column" &&
        (!(rule.from?.trim()) || !(rule.to?.trim()))
      ) {
        setFieldErrors(true);
        setError("请填写完整的列重命名规则");
        return false;
      }
      if (
        (rule.type === "cast_type" ||
          rule.type === "fill_null" ||
          rule.type === "filter_rows") &&
        !(rule.column?.trim())
      ) {
        setFieldErrors(true);
        setError("请填写规则涉及的列名");
        return false;
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
      markSaved(rules);
      toast.success("清洗规则已保存");
      return true;
    } catch (err) {
      setError(mapApiError(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndLeave = async () => {
    const ok = await handleSave();
    if (ok) confirmLeave();
  };

  const applyDirtyOrdersDemoTemplate = () => {
    setRules([...DIRTY_ORDERS_DEMO_ETL_RULES]);
    setError(null);
    setFieldErrors(false);
  };

  const applyAutoSuggestedRules = () => {
    if (columns.length === 0) {
      toast.warning("未能加载源表列信息，请确认同步任务已选业务源连接与源表");
      return;
    }
    const hasExistingRules = rules.some((rule) =>
      Object.entries(rule).some(([key, value]) => key !== "type" && Boolean(value?.trim())),
    );
    if (
      hasExistingRules &&
      !window.confirm("重新识别将覆盖当前规则，是否继续？")
    ) {
      return;
    }
    const suggested = suggestEtlRulesFromColumns(columns);
    if (suggested.length === 0) {
      setRules([]);
      setError(null);
      setFieldErrors(false);
      toast.info("未识别到需要清洗的规则，源表列看起来已较规范");
      return;
    }
    setRules(suggested);
    setError(null);
    setFieldErrors(false);
    toast.success(`已生成 ${suggested.length} 条建议规则，确认后请保存`);
  };

  const showDemoTemplate =
    sourceTable?.trim().toLowerCase() === DIRTY_ORDERS_DEMO_SOURCE_TABLE;

  const pageDescription = useMemo(() => {
    if (!isBaselineReady) return "加载清洗规则中…";
    if (isDirty) return "有未保存的更改 · 保存后生效";
    return `已保存 · ${summarizeEtlRules(rules)}`;
  }, [isBaselineReady, isDirty, rules]);

  if (loading) {
    return (
      <AdminPageShell layout="fill" title="清洗规则" icon={etlRulesPageIcon}>
        <Skeleton className="h-full min-h-[480px] w-full rounded-2xl" />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      layout="fill"
      title="清洗规则"
      icon={etlRulesPageIcon}
      description={pageDescription}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/ingestion/sync-jobs">返回列表</Link>
        </Button>
      }
    >
      <div
        className={cn(
          ADMIN_PAGE_SURFACE_CLASS,
          "flex min-h-0 flex-1 flex-col overflow-hidden",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar px-6 py-6 lg:px-8 lg:py-8">
          {error ? (
            <div className="mb-4 shrink-0">
              <PageErrorBanner message={error} onRetry={() => void loadRules()} />
            </div>
          ) : null}

          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-theme-xs text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300">
            创建任务时已根据源表自动生成默认清洗规则；可按需修改后保存。
            {hasDataSource ? (
              <>
                {" "}
                列名可从源表下拉选择，也可手动输入。
                {columnsLoading ? " 正在加载列信息…" : null}
                {columnsReady ? ` 已加载 ${columnNames.length} 列。` : null}
                {!columnsReady && !columnsLoading && hasDataSource
                  ? " 未能读取源表列信息，已按原样入湖处理。"
                  : null}
              </>
            ) : (
              " 当前任务未绑定业务源连接，列名请手动输入。"
            )}
          </div>

          {showDemoTemplate ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-4 py-3 dark:border-brand-500/30 dark:bg-brand-500/10">
              <p className="flex-1 text-theme-xs text-gray-600 dark:text-gray-300">
                源表为 <span className="font-mono">{DIRTY_ORDERS_DEMO_SOURCE_TABLE}</span>
                ：可一键应用演示模板（amount cast→float，过滤 status=deleted）。
              </p>
              <Button type="button" variant="outline" size="sm" onClick={applyDirtyOrdersDemoTemplate}>
                应用演示清洗模板
              </Button>
            </div>
          ) : null}

          <ListPageBatchActions
            batchMode={batch.batchMode}
            onToggleBatchMode={batch.toggleBatchMode}
            selectedCount={selection.selectedCount}
            entityLabel="条规则"
            onClear={selection.clear}
            onDelete={removeSelectedRules}
          />

          <div className="mt-4 space-y-4">
        {rules.map((rule, index) => (
          <div
            key={index}
            className="space-y-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800"
          >
            <div className="flex items-center justify-between gap-3">
              {batch.batchMode ? (
                <ListRowCheckbox
                  checked={selection.isSelected(String(index))}
                  onCheckedChange={() => selection.toggle(String(index))}
                  ariaLabel={`选择规则 ${index + 1}`}
                />
              ) : null}
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
                <EtlColumnField
                  label="源列名"
                  value={rule.from ?? ""}
                  columnNames={columnNames}
                  placeholder="product_name"
                  invalid={fieldErrors && !rule.from?.trim()}
                  onChange={(value) => updateRule(index, "from", value)}
                />
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
                <EtlColumnField
                  label="列名"
                  value={rule.column ?? ""}
                  columnNames={columnNames}
                  placeholder="amount"
                  invalid={fieldErrors && !rule.column?.trim()}
                  onChange={(value) => updateRule(index, "column", value)}
                />
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
                <EtlColumnField
                  label="列名"
                  value={rule.column ?? ""}
                  columnNames={columnNames}
                  placeholder="note"
                  invalid={fieldErrors && !rule.column?.trim()}
                  onChange={(value) => updateRule(index, "column", value)}
                />
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
                <EtlColumnField
                  label="列名"
                  value={rule.column ?? ""}
                  columnNames={columnNames}
                  placeholder="status"
                  invalid={fieldErrors && !rule.column?.trim()}
                  onChange={(value) => updateRule(index, "column", value)}
                />
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
          <Button
            type="button"
            variant="outline"
            disabled={!hasDataSource}
            onClick={applyAutoSuggestedRules}
          >
            重新识别并覆盖
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={saving}
            disabled={!isDirty}
            onClick={() => void handleSave()}
          >
            保存规则
          </Button>
        </div>
          </div>
        </div>
      </div>
      <UnsavedLeaveDialog
        open={leaveDialogOpen}
        saving={saving}
        entityLabel="清洗规则"
        onStay={cancelLeave}
        onDiscardLeave={confirmLeave}
        onSaveAndLeave={handleSaveAndLeave}
      />
    </AdminPageShell>
  );
}
