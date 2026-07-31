import type { ReactNode } from "react";
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

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 border-b border-gray-100 pb-6 last:border-b-0 last:pb-0 dark:border-gray-800">
      <div>
        <h3 className="text-theme-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FormField({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "grid gap-2"}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-theme-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  );
}

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
          toast.success("预制绑定已保存");
          onSaved?.();
        },
        onError: (err) => toast.error(mapApiError(err)),
      },
    );
  };

  if (readOnly) return null;

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <FormSection title="标识与展示" description="绑定键创建后不可修改，显示名将出现在列表与 Hub。">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="prefab-binding-key" label="绑定键" hint="唯一标识，用于 API 与深链。">
            <Input
              id="prefab-binding-key"
              className="h-11 font-mono text-theme-sm"
              value={bindingKey}
              onChange={(e) => setBindingKey(e.target.value)}
              placeholder="prefab-entity-lifecycle"
              disabled={Boolean(binding)}
            />
          </FormField>
          <FormField id="prefab-display-name" label="显示名称">
            <Input
              id="prefab-display-name"
              className="h-11"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="实体生命周期分布"
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="分析模型" description="实体类型须已在元数据中注册物理表。">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="prefab-entity-type" label="实体类型">
            <Input
              id="prefab-entity-type"
              className="h-11 font-mono text-theme-sm"
              value={entityTypeCode}
              onChange={(e) => setEntityTypeCode(e.target.value)}
              placeholder="equipment"
            />
          </FormField>
          <FormField id="prefab-analysis-type" label="分析类型">
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
          </FormField>
          <FormField
            id="prefab-dimensions"
            label="分析维度"
            hint="多个维度用英文逗号分隔。"
            className="grid gap-2 sm:col-span-2"
          >
            <Input
              id="prefab-dimensions"
              className="h-11"
              value={dimensionCodes}
              onChange={(e) => setDimensionCodes(e.target.value)}
              placeholder="status, region"
            />
          </FormField>
        </div>
      </FormSection>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Button type="submit" variant="primary" className="h-11 min-w-[7.5rem]" disabled={upsertBinding.isPending}>
          {upsertBinding.isPending ? "保存中…" : "保存绑定"}
        </Button>
      </div>
    </form>
  );
}
