import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { DatasetBindPanel } from "./components/DatasetBindPanel";
import { DatasetEditorForm } from "./DatasetEditorForm";
import type { DatasetEditorValues, DatasetItem } from "./types";

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

  useEffect(() => {
    if (!detailQuery.data) return;
    const item = detailQuery.data;
    setValues({
      datasetId: item.datasetId,
      displayName: item.displayName,
      tables: item.tables.map((t) => ({ ...t })),
      computedFields: item.computedFields.map((c) => ({ ...c })),
      allowedRoles: [...item.allowedRoles],
    });
  }, [detailQuery.data]);

  const handleSave = async () => {
    const body = normalizeValues(values);
    setIsSaving(true);
    try {
      if (mode === "create") {
        await apiFetch("/api/v1/datasets", { method: "POST", body: JSON.stringify(body) });
        toast.success("Dataset 已创建");
      } else {
        await apiFetch(`/api/v1/datasets/${body.datasetId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Dataset 已更新");
      }
      await queryClient.invalidateQueries({ queryKey: ["datasets"] });
      navigate("/admin/datasets");
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (mode === "edit" && detailQuery.isLoading) {
    return (
      <AdminPageShell title="编辑 Dataset">
        <Skeleton className="h-[520px] w-full rounded-2xl" />
      </AdminPageShell>
    );
  }

  if (mode === "edit" && detailQuery.isError) {
    return (
      <AdminPageShell
        title="编辑 Dataset"
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
      title={mode === "create" ? "新建 Dataset" : "编辑 Dataset"}
      description="配置语义层数据集：从数据源选择物理表，并定义可在报表中复用的计算字段。"
      actions={
        <Button asChild variant="outline">
          <Link to="/admin/datasets">返回列表</Link>
        </Button>
      }
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm",
          "dark:border-gray-800 dark:bg-white/[0.03]",
        )}
      >
        <DatasetEditorForm
          mode={mode}
          values={values}
          onChange={setValues}
          onSubmit={() => void handleSave()}
          isSaving={isSaving}
        />
        {mode === "edit" && id ? (
          <DatasetBindPanel
            datasetId={values.datasetId}
            tables={values.tables}
            boundConfigId={detailQuery.data?.boundConfigId}
            onBound={() => void detailQuery.refetch()}
          />
        ) : null}
      </div>
    </AdminPageShell>
  );
}
