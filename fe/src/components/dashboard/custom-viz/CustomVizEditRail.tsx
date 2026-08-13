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
import type { CustomVizFieldTarget } from "./customVizFieldSlots";
import { sanitizeManifestLabel } from "./customVizManifestLabels";
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
  const [activeFieldTarget, setActiveFieldTarget] = useState<CustomVizFieldTarget>({
    kind: "dimension",
    index: 0,
  });

  const { data: meta } = useQuery({
    queryKey: queryKeys.aiViz.detail(artifactId ?? "none"),
    queryFn: () => fetchAiVizArtifactMeta(artifactId!),
    enabled: Boolean(artifactId),
  });

  const inspector = useCustomVizInspectorState(cfg, onChange);

  const typeLabel = sanitizeManifestLabel(meta?.manifest.displayName, "自定义组件");
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
          activeFieldTarget={activeFieldTarget}
          onActiveFieldTargetChange={setActiveFieldTarget}
          binding={inspector.binding}
          chartCfg={inspector.chartCfg}
          patchBinding={inspector.patchBinding}
          columns={inspector.columns}
          refreshColumns={inspector.refreshColumns}
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
            datasetId={inspector.binding.datasetId}
            datasetsLoading={inspector.datasetsLoading}
            datasetsError={inspector.datasetsError}
            datasetsEmpty={inspector.datasetsEmpty}
            datasetItems={inspector.datasetItems}
            columns={inspector.columns}
            columnsLoading={inspector.columnsLoading}
            columnsReady={inspector.columnsReady}
            onDatasetSelect={inspector.handleDatasetSelect}
            datasetBindingError={inspector.datasetBindingError}
            onFieldClick={(field) => inspector.assignField(field, activeFieldTarget)}
            onRefreshFields={inspector.refreshColumns}
          />
        ) : (
          <FieldBankPlaceholder />
        )
      }
    />
  );
}
