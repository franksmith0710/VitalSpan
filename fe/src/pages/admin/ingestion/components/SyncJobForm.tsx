import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router";
import {
  HUB_SEGMENTED_BUTTON_CLASS,
  HUB_SEGMENTED_SHELL_CLASS,
} from "@/components/dashboard/hubFilterUi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SyncJobConsumeGuide } from "./SyncJobConsumeGuide";
import { CRON_PRESETS } from "./sync-job-types";
import { DIRTY_ORDERS_DEMO_SOURCE_TABLE } from "../etlDemoTemplate";

export const SYNC_JOB_FORM_ID = "sync-job-form";

export type SyncMode = "full" | "incremental";

export type DatasourceItem = {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
};

export type LegacyInlineSource = {
  host: string;
  port: number;
  database: string;
  username: string;
};

export type JobFormState = {
  name: string;
  sourceDataSourceId: string;
  table: string;
  target_table: string;
  syncMode: SyncMode;
  primaryKey: string;
  incrementalColumn: string;
  schedule_cron: string;
  enabled: boolean;
};

type SyncJobFormProps = {
  form: JobFormState;
  isEdit: boolean;
  etlRulesHref?: string;
  datasources: DatasourceItem[];
  selectedDatasource?: DatasourceItem;
  selectedSyncFetchReady?: boolean;
  legacyInlineSource?: LegacyInlineSource | null;
  fieldErrors: Record<string, string>;
  /** 其他任务已占用的同名 target_table（编辑时不含自身） */
  conflictingJobNames?: string[];
  /** 按当前源表重新建议唯一目标表名 */
  onSuggestTargetTable?: () => void;
  jobId?: string;
  justCreated?: boolean;
  formId?: string;
  onChange: <K extends keyof JobFormState>(key: K, value: JobFormState[K]) => void;
  onSubmit: (event?: FormEvent) => void;
};

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0 dark:border-gray-800">
      <div className="mb-4">
        <h3 className="text-theme-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function SegmentedChoice<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(HUB_SEGMENTED_SHELL_CLASS, "inline-flex flex-wrap gap-0.5")}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active ? "subtle" : "ghost"}
            className={HUB_SEGMENTED_BUTTON_CLASS}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

export function SyncJobForm({
  form,
  isEdit,
  etlRulesHref,
  datasources,
  selectedDatasource,
  selectedSyncFetchReady = true,
  legacyInlineSource = null,
  fieldErrors,
  conflictingJobNames = [],
  onSuggestTargetTable,
  jobId,
  justCreated = false,
  formId = SYNC_JOB_FORM_ID,
  onChange,
  onSubmit,
}: SyncJobFormProps) {
  return (
    <form
      id={formId}
      className="mx-auto grid w-full max-w-3xl gap-6"
      onSubmit={(event) => onSubmit(event)}
    >
      {isEdit && form.target_table ? (
        <SyncJobConsumeGuide
          jobId={jobId}
          jobName={form.name.trim() || undefined}
          targetTable={form.target_table}
          syncMode={form.syncMode}
          variant="how_to"
          justCreated={justCreated}
        />
      ) : null}

      <FormSection title="基本信息" description="任务名称用于在列表与日志中识别此次同步。">
        <div className="grid gap-2">
          <Label htmlFor="name">任务名称</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            required
            className="h-11"
            placeholder="例如：订单表每日同步"
          />
        </div>
      </FormSection>

      <FormSection
        title="业务源连接"
        description="凭证仅在连接管理登记；仅列出已支持同步拉数的业务源（连接管理中带「可作同步源」标记）。"
      >
        {legacyInlineSource ? (
          <Alert severity="warning">
            <AlertTitle>此任务仍使用旧版内联连接</AlertTitle>
            <AlertDescription className="text-theme-xs">
              旧快照：
              <span className="font-mono">
                {" "}
                {legacyInlineSource.username}@{legacyInlineSource.host}:{legacyInlineSource.port}/
                {legacyInlineSource.database}
              </span>
              。请在下拉框选择连接管理中对应的业务源连接后保存，以完成迁移。
            </AlertDescription>
          </Alert>
        ) : null}

        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          请先在
          <Link
            to="/admin/datasources"
            className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
          >
            连接管理
          </Link>
          登记可查询且已支持同步拉数的数据源，再在此选择。引用时会快照凭证；源库改密后请重新保存任务。
        </p>

        <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
          {datasources.length === 0 ? (
            <Alert severity="warning">
              <AlertTitle>尚无已支持同步拉数的连接</AlertTitle>
              <AlertDescription className="text-theme-xs">
                请先在
                <Link
                  to="/admin/datasources/new"
                  className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                >
                  连接管理
                </Link>
                登记带「可作同步源」标记的数据源（如 MySQL、PostgreSQL、CSV 等），再返回创建同步任务。
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="datasource">业务源连接</Label>
                <Select
                  value={form.sourceDataSourceId || undefined}
                  onValueChange={(value) => onChange("sourceDataSourceId", value)}
                >
                  <SelectTrigger id="datasource" className="h-11" aria-label="业务源连接">
                    <SelectValue placeholder="选择已登记的业务源连接" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasources.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedDatasource && !selectedSyncFetchReady ? (
                <Alert severity="warning">
                  <AlertTitle>当前连接暂不支持同步拉数</AlertTitle>
                  <AlertDescription className="text-theme-xs">
                    该连接器类型（{selectedDatasource.type}）可查询但同步拉数尚未实现。请改选带「可作同步源」标记的连接后再保存或运行。
                  </AlertDescription>
                </Alert>
              ) : null}
              {selectedDatasource ? (
                <p className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                  {selectedDatasource.host}:{selectedDatasource.port}/{selectedDatasource.database}
                </p>
              ) : null}
            </>
          )}
        </div>
      </FormSection>

      <FormSection
        title="同步目标"
        description="从业务源表读取，写入托管分析库中的目标表（同步产出）。"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="table">源对象</Label>
            <Input
              id="table"
              value={form.table}
              onChange={(e) => onChange("table", e.target.value)}
              required
              className="h-11"
              placeholder="dirty_orders"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="target_table">目标表</Label>
            <Input
              id="target_table"
              value={form.target_table}
              onChange={(e) => onChange("target_table", e.target.value)}
              required
              className="h-11"
              placeholder="orders_clean"
            />
            {onSuggestTargetTable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={onSuggestTargetTable}
              >
                按源表重新建议表名
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          每个目标表对应一个 Dataset；多个任务写入同一目标表会共用 Dataset，且全量同步会互相覆盖分析库中的数据。
        </p>
        <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-theme-xs text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300">
          <span className="font-medium text-gray-700 dark:text-gray-200">写入位置：</span>
          托管分析库（平台配置，本地示例
          <span className="font-mono"> 127.0.0.1:5433/analytics</span>）。运行成功后可在本页或列表
          <strong className="font-semibold"> 一键创建 Dataset </strong>
          出图，无需手动登记分析库。
        </div>
        {conflictingJobNames.length > 0 ? (
          <Alert severity="warning">
            <AlertTitle>目标表与已有任务重复</AlertTitle>
            <AlertDescription className="text-theme-xs text-warning-700 dark:text-warning-400">
              已有任务「{conflictingJobNames.join("、")}」写入
              <span className="font-mono"> {form.target_table}</span>
              ，保存后将共用 Dataset
              <span className="font-mono"> {form.target_table}</span>。若需独立出图，请改用不同目标表名。
            </AlertDescription>
          </Alert>
        ) : null}
        {form.table.trim() === DIRTY_ORDERS_DEMO_SOURCE_TABLE ? (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            演示源表含脏数据（如 amount=not-a-number）。保存任务后，在{" "}
            {etlRulesHref ? (
              <Link
                to={etlRulesHref}
                className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
              >
                清洗规则
              </Link>
            ) : (
              "清洗规则"
            )}{" "}
            页点击「应用演示清洗模板」，在入湖时 cast amount 并过滤 deleted 行；Dataset 不负责洗数据。
          </p>
        ) : null}
      </FormSection>

      <FormSection title="同步策略" description="全量每次覆盖目标表；增量按主键 upsert 并记录水位。">
        <div className="grid gap-3">
          <Label>同步方式</Label>
          <SegmentedChoice
            ariaLabel="同步方式"
            value={form.syncMode}
            options={[
              { value: "full", label: "全量" },
              { value: "incremental", label: "增量" },
            ]}
            onChange={(value) => onChange("syncMode", value)}
          />
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
            {form.syncMode === "full"
              ? "每次运行清空目标表后重新写入。"
              : "按主键 upsert，不 truncate；首次运行等同 bootstrap 全量拉取。"}
          </p>
        </div>

        {form.syncMode === "incremental" ? (
          <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.02] sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="primary_key">主键字段</Label>
              <Input
                id="primary_key"
                value={form.primaryKey}
                onChange={(e) => onChange("primaryKey", e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="incremental_column">增量字段</Label>
              <Input
                id="incremental_column"
                value={form.incrementalColumn}
                onChange={(e) => onChange("incrementalColumn", e.target.value)}
                required
                className="h-11"
              />
            </div>
          </div>
        ) : null}
      </FormSection>

      <FormSection title="调度" description="留空表示仅手动运行；填写合法 Cron 且启用任务后按表达式自动执行。">
        <div className="grid gap-2">
          <Label htmlFor="schedule_cron">定时 Cron（可选）</Label>
          <Input
            id="schedule_cron"
            value={form.schedule_cron}
            onChange={(e) => onChange("schedule_cron", e.target.value)}
            className="h-11 font-mono"
            placeholder="0 2 * * *"
            aria-invalid={Boolean(fieldErrors.schedule_cron)}
            aria-describedby={fieldErrors.schedule_cron ? "schedule_cron-error" : undefined}
          />
          {fieldErrors.schedule_cron ? (
            <p id="schedule_cron-error" className="text-theme-xs text-error-600 dark:text-error-400">
              {fieldErrors.schedule_cron}
            </p>
          ) : (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              常用：
              {CRON_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-1 py-0 text-theme-xs"
                  onClick={() => onChange("schedule_cron", preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
          <div>
            <Label htmlFor="enabled" className="text-theme-sm">
              启用任务
            </Label>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              关闭后不参与 Cron 调度，仍可手动运行。
            </p>
          </div>
          <Switch
            id="enabled"
            checked={form.enabled}
            onCheckedChange={(checked) => onChange("enabled", checked)}
          />
        </div>
      </FormSection>
    </form>
  );
}
