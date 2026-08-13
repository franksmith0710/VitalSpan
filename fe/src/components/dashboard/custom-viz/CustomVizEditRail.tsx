import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { fetchAiVizArtifactMeta } from "@/lib/aiVizArtifacts";
import { queryKeys } from "@/lib/queryKeys";
import type { LayoutWidget, CustomVizWidgetConfig } from "../layoutUtils";
import { DatasetPickerPanel } from "../DatasetPickerPanel";
import { FieldBankPlaceholder } from "../DatasetFieldBank";
import { WidgetEditRailLayout } from "../WidgetEditRailLayout";
import { CustomVizEditorColumn } from "./CustomVizEditorColumn";
import { useCustomVizInspectorState } from "./useCustomVizInspectorState";

export type CustomVizEditRailProps = {
  widget: LayoutWidget & { customVizConfig: CustomVizWidgetConfig };
  onChange: (config: CustomVizWidgetConfig) => void;
  onTitleChange?: (title: string) => void;
  onDelete?: () => void;
  onDataRefresh?: () => void;
  className?: string;
};

export function CustomVizEditRail({
  widget,
  onChange,
  onDelete,
  onDataRefresh,
  className,
}: CustomVizEditRailProps) {
  const cfg = widget.customVizConfig;
  const artifactId = cfg.artifactId?.trim();
  const [activeKind, setActiveKind] = useState<"dimension" | "metric">("dimension");

  const { data: meta } = useQuery({
    queryKey: queryKeys.aiViz.detail(artifactId ?? "none"),
    queryFn: () => fetchAiVizArtifactMeta(artifactId!),
    enabled: Boolean(artifactId),
  });

  const {
    binding,
    handleDatasetSelect,
    assignField,
    columns,
    columnsLoading,
    columnsReady,
    refreshColumns,
    datasetItems,
    datasetsLoading,
    datasetsError,
    datasetsEmpty,
    datasetBindingError,
  } = useCustomVizInspectorState(cfg, onChange);

  const typeLabel = meta?.manifest.displayName ?? "自定义组件";
  const leftSubtitle = widget.title && widget.title !== typeLabel ? widget.title : undefined;

  return (
    <WidgetEditRailLayout
      className={cn("h-full min-h-0", className)}
      leftLabel={typeLabel}
      leftSubtitle={leftSubtitle}
      rightLabel="数据集"
      left={
        <CustomVizEditorColumn
          widgetTitle={widget.title}
          config={cfg}
          manifest={meta?.manifest}
          activeKind={activeKind}
          onActiveKindChange={setActiveKind}
          onChange={onChange}
          onDelete={onDelete}
          onDataRefresh={onDataRefresh}
          className="border-r border-gray-200 dark:border-gray-800"
        />
      }
      right={
        artifactId ? (
          <DatasetPickerPanel
            widgetId={widget.id}
            datasetId={binding.datasetId}
            datasetsLoading={datasetsLoading}
            datasetsError={datasetsError}
            datasetsEmpty={datasetsEmpty}
            datasetItems={datasetItems}
            columns={columns}
            columnsLoading={columnsLoading}
            columnsReady={columnsReady}
            onDatasetSelect={handleDatasetSelect}
            datasetBindingError={datasetBindingError}
            onFieldClick={(field) => assignField(field, activeKind)}
            onRefreshFields={refreshColumns}
          />
        ) : (
          <FieldBankPlaceholder />
        )
      }
    />
  );
}
