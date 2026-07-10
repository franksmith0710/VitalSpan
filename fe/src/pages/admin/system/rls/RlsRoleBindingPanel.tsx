import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import type { DimensionGroupOut, RoleOut } from "./rls-types";

type Props = {
  groups: DimensionGroupOut[];
  groupsLoading: boolean;
};

/**
 * 角色 ↔ 维度分组全量绑定。
 * API 仅提供 PUT 全量替换；无 GET 时以空选起步，保存即覆盖。
 */
export function RlsRoleBindingPanel({ groups, groupsLoading }: Props) {
  const qc = useQueryClient();
  const [roleId, setRoleId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rolesQuery = useQuery({
    queryKey: queryKeys.roles.list({ limit: 100, offset: 0 }),
    queryFn: () =>
      apiFetch<{ items: RoleOut[]; total: number }>("/api/v1/roles?limit=100&offset=0"),
  });

  useEffect(() => {
    setSelected(new Set());
  }, [roleId]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/roles/${roleId}/dimension-groups`, {
        method: "PUT",
        body: JSON.stringify({ group_ids: Array.from(selected) }),
      }),
    onSuccess: async () => {
      toast.success("角色维度分组已绑定");
      await qc.invalidateQueries({ queryKey: ["rls"] });
    },
    onError: (err) => toast.error(mapApiError(err)),
  });

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const roles = (rolesQuery.data?.items ?? []).filter((r) => r.isActive);

  return (
    <div className="space-y-4">
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        选择角色并勾选维度分组后保存。保存将<strong>全量替换</strong>该角色的分组绑定（调用{" "}
        <code className="font-mono text-theme-xs">PUT /roles/&#123;id&#125;/dimension-groups</code>
        ）。
      </p>

      {rolesQuery.isError ? (
        <p className="text-theme-sm text-error-700 dark:text-error-400">
          {mapApiError(rolesQuery.error)}
        </p>
      ) : null}

      <div className="grid gap-2 sm:max-w-sm">
        <Label>角色</Label>
        <Select value={roleId || undefined} onValueChange={setRoleId}>
          <SelectTrigger aria-label="选择角色">
            <SelectValue placeholder="选择要绑定的角色" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}（{r.code}）
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">维度分组</p>
        {groupsLoading || rolesQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">请先创建维度分组</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => {
              const checked = selected.has(g.id);
              return (
                <li key={g.id} className="flex items-start gap-3">
                  <Checkbox
                    id={`bind-group-${g.id}`}
                    checked={checked}
                    disabled={!roleId}
                    onCheckedChange={(v) => toggle(g.id, v === true)}
                    aria-label={`绑定 ${g.name}`}
                  />
                  <Label htmlFor={`bind-group-${g.id}`} className="cursor-pointer leading-snug">
                    <span className="font-medium text-gray-800 dark:text-white/90">{g.name}</span>
                    <span className="mt-0.5 block font-mono text-theme-xs text-gray-500">
                      {g.code}
                    </span>
                  </Label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          disabled={!roleId || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          保存绑定
        </Button>
      </div>
    </div>
  );
}
