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

const ANALYSIS_TYPES = ["lifecycle", "activity", "trend", "distribution"] as const;

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
      toast.error("请填写 bindingKey、显示名与至少一个维度");
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
    <div className="grid gap-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
      <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">编辑预制绑定</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="prefab-binding-key">bindingKey</Label>
          <Input
            id="prefab-binding-key"
            value={bindingKey}
            onChange={(e) => setBindingKey(e.target.value)}
            disabled={Boolean(binding)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prefab-display-name">显示名</Label>
          <Input
            id="prefab-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="prefab-entity-type">实体类型</Label>
          <Input
            id="prefab-entity-type"
            value={entityTypeCode}
            onChange={(e) => setEntityTypeCode(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>分析类型</Label>
          <Select value={analysisType} onValueChange={setAnalysisType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANALYSIS_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="prefab-dimensions">维度（逗号分隔）</Label>
          <Input
            id="prefab-dimensions"
            value={dimensionCodes}
            onChange={(e) => setDimensionCodes(e.target.value)}
          />
        </div>
      </div>
      <Button type="button" variant="primary" size="sm" disabled={upsertBinding.isPending} onClick={handleSubmit}>
        {upsertBinding.isPending ? "保存中…" : "保存绑定"}
      </Button>
    </div>
  );
}
