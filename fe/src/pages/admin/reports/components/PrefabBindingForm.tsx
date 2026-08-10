import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mapApiError } from "@/lib/apiError";
import { TemplateField, TemplatePanelSection } from "./templatePanelUi";
import { type PrefabBinding, usePrefabReports } from "../usePrefabReports";

const ANALYSIS_TYPES = [
  { value: "lifecycle", label: "生命周期" },
  { value: "activity", label: "活跃度" },
  { value: "trend", label: "趋势" },
  { value: "distribution", label: "分布" },
] as const;

type Props = {
  binding?: PrefabBinding | null;
  readOnly?: boolean;
  onSaved?: (bindingKey: string) => void;
};

export function PrefabBindingForm({ binding, readOnly = false, onSaved }: Props) {
  const { upsertBinding } = usePrefabReports();
  const [bindingKey, setBindingKey] = useState(binding?.bindingKey ?? "");
  const [displayName, setDisplayName] = useState(binding?.displayName ?? "");
  const [entityTypeCode, setEntityTypeCode] = useState(binding?.entityTypeCode ?? "equipment");
  const [analysisType, setAnalysisType] = useState(binding?.analysisType ?? "lifecycle");
  const [dimensionCodes, setDimensionCodes] = useState(
    binding?.dimensionCodes?.join(", ") ?? "status",
  );

  useEffect(() => {
    if (!binding) return;
    setBindingKey(binding.bindingKey);
    setDisplayName(binding.displayName);
    setEntityTypeCode(binding.entityTypeCode);
    setAnalysisType(binding.analysisType);
    setDimensionCodes(binding.dimensionCodes.join(", "));
  }, [binding]);

  useEffect(() => {
    if (binding) return;
    if (analysisType === "lifecycle") setDimensionCodes("status");
    else if (analysisType === "distribution") setDimensionCodes("region");
    else if (analysisType === "activity" || analysisType === "trend") setDimensionCodes("status");
  }, [analysisType, binding]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const dims = dimensionCodes
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    if (!bindingKey.trim() || !displayName.trim() || dims.length === 0) {
      toast.error("请填写绑定键、显示名与至少一个维度");
      return;
    }
    upsertBinding.mutate(
      {
        bindingKey: bindingKey.trim(),
        body: {
          bindingKey: bindingKey.trim(),
          displayName: displayName.trim(),
          entityTypeCode: entityTypeCode.trim(),
          analysisType,
          dimensionCodes: dims,
          allowedRoles: ["analyst", "admin"],
        },
      },
      {
        onSuccess: () => {
          toast.success(binding ? "预制绑定已保存" : "预制绑定已创建");
          onSaved?.(bindingKey.trim());
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  if (readOnly) return null;

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <TemplatePanelSection
        title="标识与展示"
        description="绑定键创建后不可修改，显示名将出现在列表与 Hub。"
        className="shadow-none"
      >
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <TemplateField id="prefab-binding-key" label="绑定键" hint="唯一标识，用于 API 与深链。">
            <Input
              id="prefab-binding-key"
              className="h-11 font-mono text-theme-sm"
              value={bindingKey}
              onChange={(e) => setBindingKey(e.target.value)}
              placeholder="prefab-entity-lifecycle"
              disabled={Boolean(binding)}
            />
          </TemplateField>
          <TemplateField id="prefab-display-name" label="显示名称" hint="在列表与 Hub 中展示的名称。">
            <Input
              id="prefab-display-name"
              className="h-11"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="实体生命周期分布"
            />
          </TemplateField>
        </div>
      </TemplatePanelSection>

      <TemplatePanelSection
        title="分析模型"
        description="实体类型须已在元数据中注册物理表。"
        className="shadow-none"
      >
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <TemplateField id="prefab-entity-type" label="实体类型" hint="须已在元数据中注册物理表。">
            <Input
              id="prefab-entity-type"
              className="h-11 font-mono text-theme-sm"
              value={entityTypeCode}
              onChange={(e) => setEntityTypeCode(e.target.value)}
              placeholder="equipment"
            />
          </TemplateField>
          <TemplateField id="prefab-analysis-type" label="分析类型" hint="决定预制分析的统计模型。">
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger id="prefab-analysis-type" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TemplateField>
          <TemplateField
            id="prefab-dimensions"
            label="分析维度"
            hint="多个维度用英文逗号分隔。"
            className="sm:col-span-2"
          >
            <Input
              id="prefab-dimensions"
              className="h-11"
              value={dimensionCodes}
              onChange={(e) => setDimensionCodes(e.target.value)}
              placeholder="status, region"
            />
          </TemplateField>
        </div>
      </TemplatePanelSection>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" className="h-11 min-w-[7.5rem]" disabled={upsertBinding.isPending}>
          {upsertBinding.isPending ? "保存中…" : binding ? "保存绑定" : "创建绑定"}
        </Button>
      </div>
    </form>
  );
}
