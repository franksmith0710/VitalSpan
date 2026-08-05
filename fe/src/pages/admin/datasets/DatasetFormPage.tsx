import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Layers } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UnsavedLeaveDialog } from "@/components/ui/unsaved-leave-dialog";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import {
  fetchDatasetQueryConfig,
  persistDatasetBind,
} from "@/lib/datasetChartBinding";
import { queryKeys } from "@/lib/queryKeys";
import {
  bindDraftFromBinding,
  EMPTY_BIND_DRAFT,
  seedBindDraftFromColumns,
} from "./components/datasetFieldWorkbenchState";
import { loadPrimaryOnly, normalizeTablesSingle } from "./datasetTableSelection";
import {
  canSubmitDataset,
  DATASET_EDITOR_FORM_ID,
  DatasetEditorForm,
} from "./DatasetEditorForm";
import { useDatasetTableColumns } from "./hooks/useDatasetTableColumns";
import type { DatasetEditorValues, DatasetItem } from "./types";

const datasetPageIcon = (
  <AdminPageHeaderIcon>
    <Layers className="size-6" aria-hidden />
  </AdminPageHeaderIcon>
);

const EMPTY: DatasetEditorValues = {
  datasetId: "",
  displayName: "",
  tables: [],
  computedFields: [],
  allowedRoles: ["analyst"],
  bindDraft: EMPTY_BIND_DRAFT,
};

function normalizeValues(values: DatasetEditorValues): DatasetEditorValues {
  return {
    ...values,
    datasetId: values.datasetId.trim(),
    displayName: values.displayName.trim(),
    tables: normalizeTablesSingle(values.tables),
    tableSourceDataSourceId: values.tableSourceDataSourceId?.trim() || undefined,
    computedFields: values.computedFields.map((f) => ({
      name: f.name.trim(),
      expression: f.expression.trim(),
    })),
    bindDraft: values.bindDraft
      ? {
          selectedColumns: [...values.bindDraft.selectedColumns],
          columnKinds: { ...values.bindDraft.columnKinds },
        }
      : EMPTY_BIND_DRAFT,
  };
}

function serializeDatasetValues(values: DatasetEditorValues): string {
  return JSON.stringify(normalizeValues(values));
}

function valuesFromSearchParams(searchParams: URLSearchParams): DatasetEditorValues {
  const targetTable = searchParams.get("targetTable")?.trim() ?? "";
  const suggestedDatasetId =
    searchParams.get("suggestedDatasetId")?.trim() || targetTable;
  const tableName = targetTable
    ? targetTable.includes(".")
      ? targetTable
      : `public.${targetTable}`
    : "";
  return {
    ...EMPTY,
    datasetId: suggestedDatasetId,
    displayName: suggestedDatasetId,
    tables: tableName ? [{ name: tableName }] : [],
  };
}

function qualifiedTableFromBinding(schema?: string, table?: string): string {
  if (!table) return "";
  if (schema) return `${schema}.${table}`;
  return table;
}

export function DatasetFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createPrefill = useMemo(
    () => (mode === "create" ? valuesFromSearchParams(searchParams) : EMPTY),
    [mode, searchParams],
  );
  const preferredDataSourceId = searchParams.get("dataSourceId")?.trim() || undefined;
  const prefillTable = searchParams.get("targetTable")?.trim() || undefined;
  const [values, setValues] = useState<DatasetEditorValues>(createPrefill);
  const [isSaving, setIsSaving] = useState(false);
  const bindSeedKeyRef = useRef("");

  const detailQuery = useQuery({
    queryKey: queryKeys.datasets.detail(id ?? ""),
    queryFn: () => apiFetch<DatasetItem>(`/api/v1/datasets/${id}`),
    enabled: mode === "edit" && Boolean(id),
    retry: (count, err) => {
      if (err instanceof Error && err.message.includes("不存在")) return false;
      return count < 1;
    },
  });

  const boundConfigId = detailQuery.data?.boundConfigId;
  const boundConfigQuery = useQuery({
    queryKey: ["query-config", boundConfigId ?? ""],
    queryFn: () => fetchDatasetQueryConfig(boundConfigId!),
    enabled: mode === "edit" && Boolean(boundConfigId),
  });

  const primaryTableName = values.tables[0]?.name ?? "";
  const dataSourceIdForColumns = values.tableSourceDataSourceId ?? preferredDataSourceId ?? "";
  const { columnNames, columnsLoading } = useDatasetTableColumns(
    dataSourceIdForColumns,
    primaryTableName,
  );

  const dsQuery = useQuery({
    queryKey: queryKeys.datasources.list(),
    queryFn: () => apiFetch<{ items: Array<{ id: string; type?: string }> }>("/api/v1/datasources"),
  });

  const { isDirty, isBaselineReady, resetBaseline, markSaved } = useFormDirtyState(
    values,
    serializeDatasetValues,
  );

  const leaveGuardEnabled = isBaselineReady && isDirty;
  const { leaveDialogOpen, confirmLeave, cancelLeave } = useUnsavedLeaveGuard({
    enabled: leaveGuardEnabled,
  });

  useEffect(() => {
    if (mode === "create") {
      setValues(createPrefill);
      if (!createPrefill.tables[0]?.name) {
        resetBaseline(createPrefill);
        bindSeedKeyRef.current = "create-empty";
      } else {
        bindSeedKeyRef.current = "";
      }
      return;
    }
    if (!detailQuery.data) return;
    const item = detailQuery.data;
    const tables = loadPrimaryOnly(item.tables);
    if (item.tables.length > 1 && tables[0]?.name) {
      toast.info(`已切换为单表模式，仅保留主表 ${tables[0].name}`);
    }
    const nextValues: DatasetEditorValues = {
      datasetId: item.datasetId,
      displayName: item.displayName,
      tables,
      computedFields: item.computedFields.map((c) => ({ ...c })),
      allowedRoles: [...item.allowedRoles],
      tableSourceDataSourceId: item.tableSourceDataSourceId ?? undefined,
      bindDraft: EMPTY_BIND_DRAFT,
    };
    setValues(nextValues);
    if (!item.tables[0]?.name) {
      resetBaseline(nextValues);
      bindSeedKeyRef.current = "edit-no-table";
    } else {
      bindSeedKeyRef.current = "";
    }
  }, [detailQuery.data, mode, resetBaseline, createPrefill]);

  useEffect(() => {
    if (!primaryTableName || columnsLoading) return;
    if (mode === "edit" && boundConfigId && boundConfigQuery.isLoading) return;

    const seedKey = `${mode}:${primaryTableName}:${boundConfigId ?? "none"}:${columnNames.join(",")}`;
    if (bindSeedKeyRef.current === seedKey) return;
    bindSeedKeyRef.current = seedKey;

    const bound = boundConfigQuery.data;
    let nextDraft = EMPTY_BIND_DRAFT;
    if (bound?.columns?.length && boundConfigId) {
      const boundTable = qualifiedTableFromBinding(bound.schema, bound.table);
      if (!boundTable || boundTable === primaryTableName) {
        nextDraft = bindDraftFromBinding(bound.columns, bound.columnKinds);
      }
    }
    if (nextDraft.selectedColumns.length === 0 && columnNames.length > 0) {
      nextDraft = seedBindDraftFromColumns(columnNames, null);
    }

    setValues((current) => {
      const nextValues = { ...current, bindDraft: nextDraft };
      resetBaseline(nextValues);
      return nextValues;
    });
  }, [
    boundConfigId,
    boundConfigQuery.data,
    boundConfigQuery.isLoading,
    columnNames,
    columnsLoading,
    mode,
    primaryTableName,
    resetBaseline,
  ]);

  const handleSave = async (): Promise<boolean> => {
    const body = normalizeValues(values);
    setIsSaving(true);
    try {
      const saved =
        mode === "create"
          ? await apiFetch<DatasetItem>("/api/v1/datasets", {
              method: "POST",
              body: JSON.stringify(body),
            })
          : await apiFetch<DatasetItem>(`/api/v1/datasets/${body.datasetId}`, {
              method: "PUT",
              body: JSON.stringify(body),
            });

      const bindDraft = body.bindDraft;
      const tableSourceId = body.tableSourceDataSourceId;
      const primaryTable = body.tables[0]?.name;
      if (
        bindDraft &&
        bindDraft.selectedColumns.length > 0 &&
        tableSourceId &&
        primaryTable
      ) {
        const connectorType =
          dsQuery.data?.items.find((d) => d.id === tableSourceId)?.type ?? "postgresql";
        try {
          const configId = await persistDatasetBind({
            datasetId: saved.datasetId,
            boundConfigId: detailQuery.data?.boundConfigId ?? boundConfigId,
            dataSourceId: tableSourceId,
            connectorType,
            tableName: primaryTable,
            selectedColumns: bindDraft.selectedColumns,
            columnKinds: bindDraft.columnKinds,
          });
          toast.success(
            mode === "create"
              ? `Dataset 已创建，出图字段已绑定（${bindDraft.selectedColumns.length} 列）`
              : `Dataset 已保存，出图字段已更新（${bindDraft.selectedColumns.length} 列）`,
          );
          await queryClient.invalidateQueries({ queryKey: ["query-config", configId] });
        } catch (bindErr) {
          toast.error(
            `Dataset 已保存，但出图字段绑定失败：${mapApiError(bindErr)}。请重试保存。`,
          );
        }
      } else {
        toast.success(mode === "create" ? "Dataset 已创建" : "Dataset 已更新");
      }

      await queryClient.invalidateQueries({ queryKey: ["datasets"] });
      markSaved(body);
      if (mode === "create") {
        navigate(`/admin/datasets/${saved.datasetId}/edit`, { replace: true });
      } else {
        void detailQuery.refetch();
      }
      return true;
    } catch (err) {
      toast.error(mapApiError(err));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndLeave = async () => {
    const ok = await handleSave();
    if (ok) confirmLeave();
  };

  const pageDescription = useMemo(() => {
    if (!isBaselineReady) return undefined;
    if (isDirty) return "有未保存的更改 · 保存后生效";
    return mode === "create" ? "填写完成后保存以创建 Dataset" : "已保存";
  }, [isBaselineReady, isDirty, mode]);

  const canSubmit = canSubmitDataset(values);

  const headerLeadingActions = (
    <Button asChild variant="outline" size="sm">
      <Link to="/admin/datasets">
        <ArrowLeft className="size-4" aria-hidden />
        返回列表
      </Link>
    </Button>
  );

  const headerActions = (
    <Button
      type="submit"
      form={DATASET_EDITOR_FORM_ID}
      variant="primary"
      size="sm"
      loading={isSaving}
      loadingText="保存中…"
      disabled={!canSubmit || isSaving || (mode === "edit" && !isDirty)}
    >
      {mode === "create" ? "创建 Dataset" : "保存"}
    </Button>
  );

  if (mode === "edit" && detailQuery.isLoading) {
    return (
      <AdminPageShell title="编辑数据集" layout="fill" icon={datasetPageIcon}>
        <Skeleton className="h-full min-h-[520px] w-full rounded-2xl" />
      </AdminPageShell>
    );
  }

  if (mode === "edit" && detailQuery.isError) {
    return (
      <AdminPageShell
        title="编辑数据集"
        layout="fill"
        icon={datasetPageIcon}
        leadingActions={headerLeadingActions}
        actions={headerActions}
      >
        <p className="text-theme-sm text-gray-600 dark:text-gray-400">{mapApiError(detailQuery.error)}</p>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title={mode === "create" ? "新建 Dataset" : "编辑数据集"}
      layout="fill"
      icon={datasetPageIcon}
      description={pageDescription}
      leadingActions={headerLeadingActions}
      actions={headerActions}
    >
      <DatasetEditorForm
        mode={mode}
        values={values}
        onChange={setValues}
        onSubmit={() => void handleSave()}
        origin={mode === "edit" ? (detailQuery.data?.origin ?? "manual") : "manual"}
        tablePickerPrefill={{
          preferredDataSourceId,
          prefillTable,
          savedDataSourceId: values.tableSourceDataSourceId,
          onDataSourceIdChange: (tableSourceDataSourceId) =>
            setValues((current) => ({ ...current, tableSourceDataSourceId })),
          boundConfigId: detailQuery.data?.boundConfigId,
          syncJobId: detailQuery.data?.syncJobId,
          onRefreshBinding: () => void detailQuery.refetch(),
          onTableChange: () => {
            bindSeedKeyRef.current = "";
          },
        }}
      />
      <UnsavedLeaveDialog
        open={leaveDialogOpen}
        saving={isSaving}
        entityLabel="Dataset"
        onStay={cancelLeave}
        onDiscardLeave={confirmLeave}
        onSaveAndLeave={handleSaveAndLeave}
      />
    </AdminPageShell>
  );
}
