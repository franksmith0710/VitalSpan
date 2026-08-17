import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ListPageFooter } from "@/components/layout/list-page-kit";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AnalysisPack, AnalysisTheme, SnapshotCronPreset } from "../useStandardAnalysis";
import {
  ALL_ANALYSIS_THEMES,
  SNAPSHOT_LABELS,
  THEME_META,
} from "./standardAnalysisUi";
import { ConfigField, ConfigSection } from "./standardAnalysisConfigUi";
import { ReportMetricDatasetFields } from "./ReportMetricDatasetFields";
import { StandardSchedulePanel } from "./StandardSchedulePanel";

type Props = {
  draft: AnalysisPack;
  isCreating: boolean;
  editingKey: string | null;
  columnOptions: string[];
  saving: boolean;
  deleting: boolean;
  onChange: (updater: (current: AnalysisPack) => AnalysisPack) => void;
  onSave: () => void;
  onDelete: () => void;
};

function FieldMappingInput({
  id,
  label,
  value,
  columns,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  columns: string[];
  onChange: (value: string) => void;
}) {
  if (columns.length > 0) {
    return (
      <ConfigField id={id} label={label}>
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger id={id} className="h-11">
            <SelectValue placeholder="选择列" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((column) => (
              <SelectItem key={column} value={column}>
                {column}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ConfigField>
    );
  }

  return (
    <ConfigField id={id} label={label}>
      <Input id={id} className="h-11" value={value} onChange={(event) => onChange(event.target.value)} />
    </ConfigField>
  );
}

function CollapsibleDeliverySection({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <ConfigSection
      title="定时投递（可选）"
      description="按周期生成 PDF 并通过邮件发送；与上方「周期快照」不同，快照仅供平台内对比上期。"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-left text-theme-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.02]"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
        <span>{open ? "收起定时投递配置" : "展开定时投递配置"}</span>
      </button>
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        也可在{" "}
        <Link to="/admin/reports/schedules" className="text-brand-600 underline dark:text-brand-400">
          调度与投递
        </Link>{" "}
        Tab 查看全部任务。
      </p>
      {open ? <div className="mt-4">{children}</div> : null}
    </ConfigSection>
  );
}

export function StandardAnalysisConfigForm({
  draft,
  isCreating,
  editingKey,
  columnOptions,
  saving,
  deleting,
  onChange,
  onSave,
  onDelete,
}: Props) {
  const toggleTheme = (theme: AnalysisTheme, checked: boolean) => {
    onChange((current) => ({
      ...current,
      enabledThemes: checked
        ? [...current.enabledThemes, theme]
        : current.enabledThemes.filter((item) => item !== theme),
    }));
  };

  const legacyBinding = !draft.datasetId && draft.physicalTableFqn;

  return (
    <form
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="shrink-0 overflow-hidden border-b border-gray-200 px-5 py-3 dark:border-gray-800">
        <div className="min-w-0">
          <h2 className="truncate text-theme-sm font-semibold text-gray-900 dark:text-white">
            {isCreating ? "新建分析包" : draft.displayName || "未命名分析包"}
          </h2>
          {!isCreating && editingKey ? (
            <p className="mt-0.5 truncate font-mono text-theme-xs text-gray-500 dark:text-gray-400">
              {editingKey}
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 py-5">
          <ConfigSection
            title="基本信息"
            description="分析包在工作台与导航中的展示名称；标识保存后不可修改。"
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <ConfigField
                id="packKey"
                label="分析包标识"
                hint={isCreating ? "英文小写与连字符，例如 equipment-overview" : undefined}
              >
                <Input
                  id="packKey"
                  className="h-11"
                  value={draft.packKey}
                  disabled={Boolean(editingKey) && !isCreating}
                  onChange={(event) => onChange((current) => ({ ...current, packKey: event.target.value }))}
                  placeholder="equipment-overview"
                />
              </ConfigField>
              <ConfigField id="displayName" label="显示名称">
                <Input
                  id="displayName"
                  className="h-11"
                  value={draft.displayName}
                  onChange={(event) => onChange((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder="设备标准分析"
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection title="数据源" description="选择已绑定查询的数据集，并映射分析所需字段。">
            {legacyBinding ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-theme-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                当前分析包仍绑定物理表「{draft.physicalTableFqn}」。选择数据集并保存后将迁移到新绑定方式。
              </p>
            ) : null}
            <ReportMetricDatasetFields
              datasetId={draft.datasetId ?? ""}
              boundConfigId={draft.boundConfigId ?? ""}
              onDatasetIdChange={(datasetId) =>
                onChange((current) => ({
                  ...current,
                  datasetId,
                  boundConfigId: "",
                  fieldMapping: { status: "", region: "", createdAt: "" },
                }))
              }
              onBoundConfigIdChange={(boundConfigId) =>
                onChange((current) => ({ ...current, boundConfigId }))
              }
              onSuggestedDataSourceId={(dataSourceId) =>
                onChange((current) => ({ ...current, dataSourceId }))
              }
            />
            <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FieldMappingInput
                id="status"
                label="状态字段"
                value={draft.fieldMapping.status ?? ""}
                columns={columnOptions}
                onChange={(status) =>
                  onChange((current) => ({
                    ...current,
                    fieldMapping: { ...current.fieldMapping, status },
                  }))
                }
              />
              <FieldMappingInput
                id="region"
                label="区域字段"
                value={draft.fieldMapping.region ?? ""}
                columns={columnOptions}
                onChange={(region) =>
                  onChange((current) => ({
                    ...current,
                    fieldMapping: { ...current.fieldMapping, region },
                  }))
                }
              />
              <FieldMappingInput
                id="createdAt"
                label="时间字段"
                value={draft.fieldMapping.createdAt ?? ""}
                columns={columnOptions}
                onChange={(createdAt) =>
                  onChange((current) => ({
                    ...current,
                    fieldMapping: { ...current.fieldMapping, createdAt },
                  }))
                }
              />
            </div>
          </ConfigSection>

          <ConfigSection title="分析主题" description="勾选要在「看分析」中展示的主题视图。">
            <div className="grid min-w-0 gap-2 md:grid-cols-2">
              {ALL_ANALYSIS_THEMES.map((theme) => {
                const checked = draft.enabledThemes.includes(theme);
                const meta = THEME_META[theme];
                return (
                  <label
                    key={theme}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 transition-colors",
                      checked
                        ? "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.04]"
                        : "border-gray-200 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.02]",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleTheme(theme, value === true)}
                      aria-label={meta.label}
                    />
                    <span className="min-w-0">
                      <span className="block text-theme-sm font-medium text-gray-800 dark:text-gray-200">
                        {meta.label}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </ConfigSection>

          <ConfigSection
            title="周期快照"
            description="平台按周期自动保存分析结果，供「对比上期」使用；不会发送邮件或推送到外部。"
          >
            <ConfigField id="snapshotCronPreset" label="快照周期" className="sm:max-w-xs">
              <Select
                value={draft.snapshotCronPreset}
                onValueChange={(value) =>
                  onChange((current) => ({ ...current, snapshotCronPreset: value as SnapshotCronPreset }))
                }
              >
                <SelectTrigger id="snapshotCronPreset" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["daily", "weekly", "monthly"] as const).map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {SNAPSHOT_LABELS[preset]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>
          </ConfigSection>

          {editingKey && !isCreating ? (
            <CollapsibleDeliverySection>
              <StandardSchedulePanel
                sourceKey={editingKey}
                packName={draft.displayName || editingKey}
              />
            </CollapsibleDeliverySection>
          ) : null}
        </div>
      </div>

      <ListPageFooter>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {isCreating ? "填写完成后保存以创建分析包。" : "修改后点击保存生效。"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {editingKey && !isCreating ? (
              <Button type="button" variant="destructive" size="sm" disabled={deleting || saving} onClick={onDelete}>
                删除
              </Button>
            ) : null}
            <Button type="submit" size="sm" loading={saving} loadingText="保存中…">
              保存
            </Button>
          </div>
        </div>
      </ListPageFooter>
    </form>
  );
}
