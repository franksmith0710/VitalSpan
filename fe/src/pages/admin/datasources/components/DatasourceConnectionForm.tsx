import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectorTypeItem } from "@/lib/connector-taxonomy";
import { cn } from "@/lib/utils";
import type { FormState } from "./datasource-form-constants";
import { applyTypePort, DatasourceTypeField, TypeHint } from "./DatasourceTypeField";
import { FileSourceConnectionFields } from "./FileSourceConnectionFields";
import { GenericConnectionFields } from "./GenericConnectionFields";
import { RestApiConnectionFields } from "./RestApiConnectionFields";
import type { FileSourceCompanionState, RestApiCompanionState } from "./datasource-form-types";

type Props = {
  mode: "create" | "edit";
  form: FormState;
  selectedTypeLabel: string;
  typeItems: ConnectorTypeItem[];
  error: string | null;
  errorCode: string | null;
  isSaving: boolean;
  advancedOpen: boolean;
  codeInputRef: RefObject<HTMLInputElement | null>;
  restApiCompanion: RestApiCompanionState;
  fileCompanion: FileSourceCompanionState;
  embedded?: boolean;
  onChangeType?: () => void;
  onAdvancedOpenChange: (open: boolean) => void;
  onClearError: () => void;
  onFieldChange: (key: keyof FormState, value: string) => void;
  onTypeChange: (type: string) => void;
  onRestApiChange: (next: RestApiCompanionState) => void;
  onFileChange: (next: FileSourceCompanionState) => void;
  onSubmit: () => void;
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

export function DatasourceConnectionForm({
  mode,
  form,
  selectedTypeLabel,
  typeItems,
  error,
  errorCode,
  isSaving,
  advancedOpen,
  codeInputRef,
  restApiCompanion,
  fileCompanion,
  embedded = false,
  onChangeType,
  onAdvancedOpenChange,
  onClearError,
  onFieldChange,
  onTypeChange,
  onRestApiChange,
  onFileChange,
  onSubmit,
}: Props) {
  const formBody = (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {error ? (
        <Alert severity="error" closable onClose={onClearError}>
          <AlertDescription className="text-theme-sm text-error-700 dark:text-error-400">
            {error}
          </AlertDescription>
        </Alert>
      ) : null}

      <FormSection
        title="基本信息"
        description="名称与标识用于在列表、查询与看板绑定中识别此连接。"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              required
              className="h-11"
              fieldState={errorCode === "DATASOURCE_NAME_CONFLICT" ? "error" : "default"}
              aria-invalid={errorCode === "DATASOURCE_NAME_CONFLICT" || undefined}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="code">标识</Label>
            <Input
              ref={codeInputRef}
              id="code"
              value={form.code}
              onChange={(e) => onFieldChange("code", e.target.value)}
              required
              readOnly={mode === "edit"}
              className="h-11"
              fieldState={errorCode === "DATASOURCE_CODE_CONFLICT" && mode === "create" ? "error" : "default"}
              aria-invalid={errorCode === "DATASOURCE_CODE_CONFLICT" && mode === "create" ? true : undefined}
            />
          </div>
          {!embedded ? (
            <DatasourceTypeField
              mode={mode}
              type={form.type}
              selectedTypeLabel={selectedTypeLabel}
              typeItems={typeItems}
              onTypeChange={(v) => onTypeChange(v)}
            />
          ) : null}
        </div>
      </FormSection>

      <FormSection
        title="连接参数"
        description={
          embedded
            ? "保存后可在详情页测试连通性并用于查询。"
            : "主机、库名与凭证；编辑时留空密码表示不修改。"
        }
      >
        {embedded ? <TypeHint type={form.type} /> : null}

        {form.type === "rest_api" ? (
          <RestApiConnectionFields value={restApiCompanion} onChange={onRestApiChange} />
        ) : form.type === "excel" || form.type === "csv" ? (
          <FileSourceConnectionFields sourceType={form.type} value={fileCompanion} onChange={onFileChange} />
        ) : (
          <GenericConnectionFields form={form} mode={mode} onFieldChange={onFieldChange} />
        )}
      </FormSection>

      <Collapsible.Root open={advancedOpen} onOpenChange={onAdvancedOpenChange}>
        <Collapsible.Trigger
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-theme-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300 dark:hover:bg-white/[0.04]"
        >
          高级选项
          <ChevronDown className={cn("size-4 transition-transform", advancedOpen && "rotate-180")} />
        </Collapsible.Trigger>
        <Collapsible.Content className="pt-3">
          <div className="grid gap-2">
            <Label htmlFor="description">描述</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              className="h-11"
              placeholder="可选，便于团队识别用途"
            />
          </div>
        </Collapsible.Content>
      </Collapsible.Root>

      <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95 lg:-mx-8 lg:px-8">
        <Button type="submit" variant="primary" disabled={isSaving} loading={isSaving} loadingText="保存中…">
          保存
        </Button>
      </div>
    </form>
  );

  if (embedded) {
    return (
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-theme-base font-semibold text-gray-900 dark:text-white">填写连接信息</h2>
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              注册后可测试连通性并用于查询与仪表板。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="light" color="primary" size="sm">
              {selectedTypeLabel}
            </Badge>
            {onChangeType ? (
              <Button type="button" variant="outline" size="sm" onClick={onChangeType}>
                更改类型
              </Button>
            ) : null}
          </div>
        </div>
        {formBody}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-theme-base font-semibold text-gray-900 dark:text-white">连接信息</h2>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {mode === "edit" ? "更新连接配置；留空密码表示不修改。" : "填写连接参数以注册新的数据源。"}
          </p>
        </div>
        <Badge variant="light" color="primary" size="sm">
          {selectedTypeLabel}
        </Badge>
      </div>
      {formBody}
    </div>
  );
}

export { applyTypePort };
