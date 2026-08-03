import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { AdminPageShell, AdminPageHeaderIcon } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UnsavedLeaveDialog } from "@/components/ui/unsaved-leave-dialog";
import { useFormDirtyState } from "@/hooks/use-form-dirty-state";
import { useUnsavedLeaveGuard } from "@/hooks/use-unsaved-leave-guard";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { DatasetBindPanel } from "./components/DatasetBindPanel";
import { DatasetEditorForm } from "./DatasetEditorForm";
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
};

function normalizeValues(values: DatasetEditorValues): DatasetEditorValues {
  return {
    ...values,
    datasetId: values.datasetId.trim(),
    displayName: values.displayName.trim(),
    computedFields: values.computedFields.map((f) => ({
      name: f.name.trim(),
      expression: f.expression.trim(),
    })),
  };
}

function serializeDatasetValues(values: DatasetEditorValues): string {
  return JSON.stringify(normalizeValues(values));
}

export function DatasetFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<DatasetEditorValues>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);

  const detailQuery = useQuery({
    queryKey: queryKeys.datasets.detail(id ?? ""),
    queryFn: () => apiFetch<DatasetItem>(`/api/v1/datasets/${id}`),
    enabled: mode === "edit" && Boolean(id),
    retry: (count, err) => {
      if (err instanceof Error && err.message.includes("不存在")) return false;
      return count < 1;
    },
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
      resetBaseline(EMPTY);
      return;
    }
    if (!detailQuery.data) return;
    const item = detailQuery.data;
    const nextValues: DatasetEditorValues = {
      datasetId: item.datasetId,
      displayName: item.displayName,
      tables: item.tables.map((t) => ({ ...t })),
      computedFields: item.computedFields.map((c) => ({ ...c })),
      allowedRoles: [...item.allowedRoles],
    };
    setValues(nextValues);
    resetBaseline(nextValues);
  }, [detailQuery.data, mode, resetBaseline]);

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
      toast.success(mode === "create" ? "Dataset 已创建" : "Dataset 已更新");
      await queryClient.invalidateQueries({ queryKey: ["datasets"] });
      markSaved(body);
      if (mode === "create") {
        navigate(`/admin/datasets/${saved.datasetId}/edit`, { replace: true });
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
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/datasets">返回列表</Link>
          </Button>
        }
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
      actions={
        <Button asChild variant="outline">
          <Link to="/admin/datasets">返回列表</Link>
        </Button>
      }
    >
      <DatasetEditorForm
        mode={mode}
        values={values}
        onChange={setValues}
        onSubmit={() => void handleSave()}
        isSaving={isSaving}
        submitDisabled={mode === "edit" && !isDirty}
        bindPanel={
          mode === "edit" && id ? (
            <DatasetBindPanel
              datasetId={values.datasetId}
              tables={values.tables}
              boundConfigId={detailQuery.data?.boundConfigId}
              onBound={() => void detailQuery.refetch()}
            />
          ) : null
        }
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
