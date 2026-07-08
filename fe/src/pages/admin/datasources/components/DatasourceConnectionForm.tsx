import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import type { RefObject } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ConnectorTypeItem } from "@/lib/connector-taxonomy";
import { cn } from "@/lib/utils";
import type { FormState } from "./datasource-form-constants";
import { applyTypePort, DatasourceTypeField } from "./DatasourceTypeField";
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
  onAdvancedOpenChange: (open: boolean) => void;
  onClearError: () => void;
  onFieldChange: (key: keyof FormState, value: string) => void;
  onTypeChange: (type: string) => void;
  onRestApiChange: (next: RestApiCompanionState) => void;
  onFileChange: (next: FileSourceCompanionState) => void;
  onSubmit: () => void;
};

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
  onAdvancedOpenChange,
  onClearError,
  onFieldChange,
  onTypeChange,
  onRestApiChange,
  onFileChange,
  onSubmit,
}: Props) {
  return (
    <Card className="mx-auto max-w-2xl w-full">
      <CardHeader>
        <CardTitle>连接信息</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
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

          <div className="grid gap-2">
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => onFieldChange("name", e.target.value)}
              required
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
              fieldState={errorCode === "DATASOURCE_CODE_CONFLICT" && mode === "create" ? "error" : "default"}
              aria-invalid={errorCode === "DATASOURCE_CODE_CONFLICT" && mode === "create" ? true : undefined}
            />
          </div>

          <DatasourceTypeField
            mode={mode}
            type={form.type}
            selectedTypeLabel={selectedTypeLabel}
            typeItems={typeItems}
            onTypeChange={(v) => onTypeChange(v)}
          />

          {form.type === "rest_api" ? (
            <RestApiConnectionFields value={restApiCompanion} onChange={onRestApiChange} />
          ) : form.type === "excel" || form.type === "csv" ? (
            <FileSourceConnectionFields sourceType={form.type} value={fileCompanion} onChange={onFileChange} />
          ) : (
            <GenericConnectionFields form={form} mode={mode} onFieldChange={onFieldChange} />
          )}

          <Collapsible.Root open={advancedOpen} onOpenChange={onAdvancedOpenChange}>
            <Collapsible.Trigger
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-theme-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-300"
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
                />
              </div>
            </Collapsible.Content>
          </Collapsible.Root>

          <Button type="submit" variant="primary" disabled={isSaving} loading={isSaving} loadingText="保存中…">
            保存
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export { applyTypePort };
