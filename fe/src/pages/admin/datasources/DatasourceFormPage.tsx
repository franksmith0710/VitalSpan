import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import {
  DISPLAY_GROUP_ORDER,
  groupTypesByDisplayGroup,
  type ConnectorTypeItem,
  type DisplayGroup,
} from "@/lib/connector-taxonomy";
import { queryKeys } from "@/lib/queryKeys";
import { Link } from "react-router";
import { emptyForm, type FormState } from "./components/datasource-form-constants";
import { applyTypePort, DatasourceConnectionForm } from "./components/DatasourceConnectionForm";
import { DatasourceFormWizard } from "./components/DatasourceFormWizard";
import {
  buildFileSourcePayload,
  buildRestApiPayload,
  defaultFileSourceCompanion,
  defaultRestApiCompanion,
} from "./components/datasource-form-types";

type WizardStep = "category" | "type" | "form";
type ConnectorTypeListResponse = { items: ConnectorTypeItem[] };

type DataSourceOut = {
  id: string;
  name: string;
  code: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  description?: string | null;
  connectionOptions?: { connectTimeoutSec?: number };
};

export function DatasourceFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [wizardStep, setWizardStep] = useState<WizardStep>(mode === "create" ? "category" : "form");
  const [selectedGroup, setSelectedGroup] = useState<DisplayGroup | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [restApiCompanion, setRestApiCompanion] = useState(defaultRestApiCompanion);
  const [fileCompanion, setFileCompanion] = useState(defaultFileSourceCompanion);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const typesQuery = useQuery({
    queryKey: queryKeys.connectorTypes,
    queryFn: () => apiFetch<ConnectorTypeListResponse>("/api/v1/datasources/types"),
  });

  const groupedTypes = useMemo(
    () => groupTypesByDisplayGroup(typesQuery.data?.items ?? []),
    [typesQuery.data?.items],
  );

  const visibleGroups = useMemo(
    () => DISPLAY_GROUP_ORDER.filter((g) => (groupedTypes.get(g)?.length ?? 0) > 0),
    [groupedTypes],
  );

  const detailQuery = useQuery({
    queryKey: queryKeys.datasources.detail(id ?? ""),
    queryFn: () => apiFetch<DataSourceOut>(`/api/v1/datasources/${id}`),
    enabled: mode === "edit" && Boolean(id),
  });

  useEffect(() => {
    if (!detailQuery.data) return;
    const ds = detailQuery.data;
    setForm({
      name: ds.name,
      code: ds.code,
      type: ds.type,
      host: ds.host,
      port: String(ds.port),
      database: ds.database,
      username: ds.username,
      password: "",
      description: ds.description ?? "",
    });
    if (ds.type === "rest_api") {
      setRestApiCompanion({
        baseUrl: ds.host,
        authMode: ds.username === "none" ? "none" : ds.username === "oauth2" ? "oauth2" : "basic",
        username: ds.username === "none" || ds.username === "oauth2" ? "" : ds.username,
        password: "",
        healthPath: ds.database || "/",
        connectTimeoutSec: ds.connectionOptions?.connectTimeoutSec ?? 5,
      });
    } else if (ds.type === "excel" || ds.type === "csv") {
      const isRemote = ds.host.startsWith("http://") || ds.host.startsWith("https://");
      setFileCompanion({
        mode: isRemote ? "remote" : "local",
        remoteUrl: isRemote ? ds.host : "",
        serverPath: isRemote ? "" : ds.host,
        sheetName: ds.database || "",
        selectedFileName: isRemote ? "" : (ds.host.split("/").pop() ?? ""),
        fileError: null,
      });
    }
  }, [detailQuery.data]);

  useEffect(() => {
    if (errorCode === "DATASOURCE_CODE_CONFLICT" && mode === "create") {
      codeInputRef.current?.focus();
      codeInputRef.current?.select();
    }
  }, [errorCode, mode]);

  const clearError = () => {
    setError(null);
    setErrorCode(null);
  };

  const setField = (key: keyof FormState, value: string) => {
    clearError();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    clearError();
    setIsSaving(true);
    try {
      const slice = { name: form.name, code: form.code, type: form.type, description: form.description };
      let payload: Record<string, unknown>;
      if (form.type === "rest_api") {
        payload = buildRestApiPayload(slice, restApiCompanion, mode, form.password);
      } else if (form.type === "excel" || form.type === "csv") {
        payload = buildFileSourcePayload(slice, fileCompanion, mode, form.password);
      } else {
        payload = {
          name: form.name,
          type: form.type,
          host: form.host,
          port: Number(form.port),
          database: form.database,
          username: form.username,
          description: form.description || null,
        };
        if (mode === "create") {
          payload.code = form.code;
          payload.password = form.password;
        }
      }

      const saved =
        mode === "create"
          ? await apiFetch<DataSourceOut>("/api/v1/datasources", {
              method: "POST",
              body: JSON.stringify(payload),
            })
          : await apiFetch<DataSourceOut>(`/api/v1/datasources/${id}`, {
              method: "PATCH",
              body: JSON.stringify(form.password ? { ...payload, password: form.password } : payload),
            });

      await queryClient.invalidateQueries({ queryKey: queryKeys.datasources.all });
      navigate(`/admin/datasources/${saved.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError) setErrorCode(err.code ?? null);
      setError(mapApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (mode === "edit" && detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const showForm = mode === "edit" || wizardStep === "form";
  const selectedTypeLabel =
    typesQuery.data?.items.find((t) => t.type === form.type)?.displayName ?? form.type;

  return (
    <AdminPageShell
      title={mode === "create" ? "新建数据源" : "编辑数据源"}
      description={mode === "create" ? "填写连接信息以注册新的数据源。" : "更新连接配置；留空密码表示不修改。"}
      actions={
        <Button asChild variant="outline">
          <Link to="/admin/datasources">返回列表</Link>
        </Button>
      }
    >
      {mode === "create" ? (
        <DatasourceFormWizard
          wizardStep={wizardStep}
          selectedGroup={selectedGroup}
          visibleGroups={visibleGroups}
          groupedTypes={groupedTypes}
          onSelectGroup={(group) => {
            setSelectedGroup(group);
            setWizardStep("type");
          }}
          onBackToCategory={() => setWizardStep("category")}
          onSelectType={(type, port) => {
            setForm((prev) => ({ ...prev, type, port }));
            setWizardStep("form");
          }}
        />
      ) : null}

      {showForm ? (
        <>
          {mode === "create" && wizardStep === "form" ? (
            <div className="mx-auto mb-4 flex max-w-2xl items-center justify-between text-theme-sm text-gray-500">
              <span>选择类型 › 连接配置</span>
              <button type="button" className="text-brand-600" onClick={() => setWizardStep("type")}>
                更改类型
              </button>
            </div>
          ) : null}

          <DatasourceConnectionForm
            mode={mode}
            form={form}
            selectedTypeLabel={selectedTypeLabel}
            typeItems={typesQuery.data?.items ?? []}
            error={error}
            errorCode={errorCode}
            isSaving={isSaving}
            advancedOpen={advancedOpen}
            codeInputRef={codeInputRef}
            restApiCompanion={restApiCompanion}
            fileCompanion={fileCompanion}
            onAdvancedOpenChange={setAdvancedOpen}
            onClearError={clearError}
            onFieldChange={setField}
            onTypeChange={(v) => {
              clearError();
              setForm((prev) => ({ ...prev, type: v, port: applyTypePort(v, prev.port) }));
            }}
            onRestApiChange={setRestApiCompanion}
            onFileChange={setFileCompanion}
            onSubmit={() => void handleSave()}
          />
        </>
      ) : null}
    </AdminPageShell>
  );
}
