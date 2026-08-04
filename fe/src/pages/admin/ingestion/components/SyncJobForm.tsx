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

export type SourceMode = "inline" | "datasource";
export type SyncMode = "full" | "incremental";

export type DatasourceItem = {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
};

export type JobFormState = {
  name: string;
  sourceMode: SourceMode;
  sourceDataSourceId: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
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
  fieldErrors: Record<string, string>;
  /** 其他任务已占用的同名 target_table（编辑时不含自身） */
  conflictingJobNames?: string[];
  /** 按当前源表重新建议唯一目标表名 */
  onSuggestTargetTable?: () => void;
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
  fieldErrors,
  conflictingJobNames = [],
  onSuggestTargetTable,
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
        title="MySQL 源库"
        description="业务 MySQL 源库连接：从已登记连接引用，或手动填写凭证。此处不是托管分析库（5433）。"
      >
        <div className="grid gap-3">
          <Label>源连接方式</Label>
          <SegmentedChoice
            ariaLabel="源连接方式"
            value={form.sourceMode}
            options={[
              { value: "datasource", label: "使用已有 MySQL 连接" },
              { value: "inline", label: "手动填写连接" },
            ]}
            onChange={(value) => onChange("sourceMode", value)}
          />
          {form.sourceMode === "datasource" ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              引用连接时会快照凭证；源库改密后请重新保存任务。
            </p>
          ) : null}
        </div>

        {form.sourceMode === "datasource" ? (
          <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="grid gap-2">
              <Label htmlFor="datasource">MySQL 数据源</Label>
              <Select
                value={form.sourceDataSourceId || undefined}
                onValueChange={(value) => onChange("sourceDataSourceId", value)}
              >
                <SelectTrigger id="datasource" className="h-11">
                  <SelectValue placeholder="选择已登记的 MySQL 数据源" />
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
            {selectedDatasource ? (
              <p className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                {selectedDatasource.host}:{selectedDatasource.port}/{selectedDatasource.database}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.02]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="host">主机</Label>
                <Input
                  id="host"
                  value={form.host}
                  onChange={(e) => onChange("host", e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="port">端口</Label>
                <Input
                  id="port"
                  value={form.port}
                  onChange={(e) => onChange("port", e.target.value)}
                  required
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="database">数据库</Label>
              <Input
                id="database"
                value={form.database}
                onChange={(e) => onChange("database", e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => onChange("username", e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">密码{isEdit ? "（留空保持不变）" : ""}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  required={!isEdit}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection title="同步目标" description="源表从 MySQL 读取，目标表写入托管分析库。">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="table">源表</Label>
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
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          目标库地址由平台环境变量{" "}
          <span className="font-mono">ANALYTICS_DATABASE_URL</span> 决定（本地默认{" "}
          <span className="font-mono">127.0.0.1:5433/analytics</span>
          ）。同步成功后请登记该 PostgreSQL 为数据源，再创建 Dataset 选目标表；看板通过 Dataset
          出图，无需在此写 SQL。
        </p>
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
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                整型或时间戳列；用于水位比较。
              </p>
            </div>
          </div>
        ) : null}
      </FormSection>

      <FormSection title="调度与状态" description="可选 Cron 定时执行；停用后仍可手动触发。">
        <div className="grid gap-2">
          <Label htmlFor="schedule_cron">定时 Cron（可选）</Label>
          <Input
            id="schedule_cron"
            placeholder="例：0 2 * * *（分 时 日 月 周）"
            value={form.schedule_cron}
            fieldState={fieldErrors.schedule_cron ? "error" : "default"}
            aria-invalid={Boolean(fieldErrors.schedule_cron)}
            aria-describedby={fieldErrors.schedule_cron ? "schedule_cron-error" : undefined}
            onChange={(e) => onChange("schedule_cron", e.target.value)}
            className="h-11"
          />
          {fieldErrors.schedule_cron ? (
            <p id="schedule_cron-error" className="text-theme-xs text-error-600 dark:text-error-400">
              {fieldErrors.schedule_cron}
            </p>
          ) : (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              五段式 Cron（分 时 日 月 周）；留空表示仅手动运行。
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {CRON_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange("schedule_cron", preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
          <div className="min-w-0">
            <Label htmlFor="enabled">启用任务</Label>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              停用后不会参与 Cron 调度，仍可手动运行。
            </p>
          </div>
          <Switch
            id="enabled"
            checked={form.enabled}
            onCheckedChange={(checked) => onChange("enabled", checked)}
            className="shrink-0"
          />
        </div>
      </FormSection>

      {isEdit && form.target_table ? (
        <SyncJobConsumeGuide targetTable={form.target_table} variant="how_to" />
      ) : null}
    </form>
  );
}
