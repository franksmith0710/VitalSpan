import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { mapApiError } from "@/lib/apiError";
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
  onSaved?: () => void;
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

  const handleSubmit = () => {
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
          toast.success("预制绑定已保存");
          onSaved?.();
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  if (readOnly) return null;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="prefab-binding-key">绑定键</Label>
          <Input
            id="prefab-binding-key"
            className="h-11 font-mono text-theme-sm"
            value={bindingKey}
            onChange={(e) => setBindingKey(e.target.value)}
            placeholder="prefab-entity-lifecycle"
            disabled={Boolean(binding)}
          />
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">唯一标识，创建后不可修改。</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prefab-display-name">显示名称</Label>
          <Input
            id="prefab-display-name"
            className="h-11"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="实体生命周期分布"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prefab-entity-type">实体类型</Label>
          <Input
            id="prefab-entity-type"
            className="h-11 font-mono text-theme-sm"
            value={entityTypeCode}
            onChange={(e) => setEntityTypeCode(e.target.value)}
            placeholder="equipment"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prefab-analysis-type">分析类型</Label>
          <Select value={analysisType} onValueChange={setAnalysisType}>
            <SelectTrigger id="prefab-analysis-type" className="h-11">
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
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="prefab-dimensions">分析维度</Label>
          <Input
            id="prefab-dimensions"
            className="h-11"
            value={dimensionCodes}
            onChange={(e) => setDimensionCodes(e.target.value)}
            placeholder="status, region"
          />
          <p className="text-theme-xs text-gray-500 dark:text-gray-400">多个维度用英文逗号分隔。</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Button
          type="button"
          variant="primary"
          className="h-11"
          disabled={upsertBinding.isPending}
          onClick={handleSubmit}
        >
          {upsertBinding.isPending ? "保存中…" : "保存绑定"}
        </Button>
      </div>
    </div>
  );
}
