import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AnalysisPack, AnalysisTheme, SnapshotCronPreset } from "../useStandardAnalysis";
import { standardAnalysisPath } from "../standardRoutes";
import {
  ALL_ANALYSIS_THEMES,
  SNAPSHOT_LABELS,
  THEME_META,
} from "./standardAnalysisUi";
import { ConfigField, ConfigSection } from "./standardAnalysisConfigUi";

type PhysicalTable = {
  tableFqn: string;
  displayName: string;
};

type Props = {
  draft: AnalysisPack;
  isCreating: boolean;
  editingKey: string | null;
  physicalTables: PhysicalTable[];
  physicalLoading: boolean;
  saving: boolean;
  deleting: boolean;
  onChange: (updater: (current: AnalysisPack) => AnalysisPack) => void;
  onSelectTable: (fqn: string) => void;
  onSave: () => void;
  onDelete: () => void;
};

export function StandardAnalysisConfigForm({
  draft,
  isCreating,
  editingKey,
  physicalTables,
  physicalLoading,
  saving,
  deleting,
  onChange,
  onSelectTable,
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

  return (
    <form
      className="flex min-h-0 min-w-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="shrink-0 border-b border-gray-200 px-5 py-3 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
          {!isCreating && editingKey ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link to={standardAnalysisPath(editingKey)}>
                <ExternalLink className="size-4" aria-hidden />
                在工作台打开
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          <ConfigSection
            title="基本信息"
            description="分析包在工作台与导航中的展示名称；标识保存后不可修改。"
          >
            <div className="grid gap-4 sm:grid-cols-2">
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

          <ConfigSection
            title="数据绑定"
            description="先填写业务对象代码，再选择对应的物理表。"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ConfigField id="businessObjectCode" label="业务对象代码">
                <Input
                  id="businessObjectCode"
                  className="h-11"
                  value={draft.businessObjectCode}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      businessObjectCode: event.target.value,
                      physicalTableFqn: "",
                      dataSourceId: "",
                    }))
                  }
                  placeholder="equipment"
                />
              </ConfigField>
              <ConfigField id="physicalTableFqn" label="物理表">
                {physicalLoading ? (
                  <Skeleton className="h-11 w-full rounded-lg" />
                ) : (
                  <Select
                    value={draft.physicalTableFqn || undefined}
                    onValueChange={onSelectTable}
                    disabled={!draft.businessObjectCode || physicalTables.length === 0}
                  >
                    <SelectTrigger id="physicalTableFqn" className="h-11">
                      <SelectValue
                        placeholder={
                          !draft.businessObjectCode
                            ? "先填写业务对象代码"
                            : physicalTables.length === 0
                              ? "未找到物理表"
                              : "选择物理表"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {physicalTables.map((table) => (
                        <SelectItem key={table.tableFqn} value={table.tableFqn}>
                          {table.displayName} · {table.tableFqn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection title="字段映射" description="映射到标准分析主题所需的列名。">
            <div className="grid gap-4 sm:grid-cols-3">
              <ConfigField id="status" label="状态字段">
                <Input
                  id="status"
                  className="h-11"
                  value={draft.fieldMapping.status ?? ""}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      fieldMapping: { ...current.fieldMapping, status: event.target.value },
                    }))
                  }
                />
              </ConfigField>
              <ConfigField id="region" label="区域字段">
                <Input
                  id="region"
                  className="h-11"
                  value={draft.fieldMapping.region ?? ""}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      fieldMapping: { ...current.fieldMapping, region: event.target.value },
                    }))
                  }
                />
              </ConfigField>
              <ConfigField id="createdAt" label="时间字段">
                <Input
                  id="createdAt"
                  className="h-11"
                  value={draft.fieldMapping.createdAt ?? ""}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      fieldMapping: { ...current.fieldMapping, createdAt: event.target.value },
                    }))
                  }
                />
              </ConfigField>
            </div>
          </ConfigSection>

          <ConfigSection title="分析主题与快照" description="勾选要在工作台展示的主题，并设置周期快照频率。">
            <div className="grid gap-2 sm:grid-cols-2">
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
        </div>
      </div>

      <ListPageFooter>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {isCreating ? "填写完成后保存以创建分析包。" : "修改后点击保存生效。"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {editingKey && !isCreating ? (
              <Button type="button" variant="outline" size="sm" disabled={deleting || saving} onClick={onDelete}>
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
