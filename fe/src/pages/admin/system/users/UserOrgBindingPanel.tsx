import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { mapUserError } from "./userErrors";

type OrgOut = { id: string; parent_id: string | null; name: string; path: string; level: number };

type UserOrgBindingPanelProps = {
  userId: string;
  onActionError: (message: string | null) => void;
};

export function UserOrgBindingPanel({ userId, onActionError }: UserOrgBindingPanelProps) {
  const queryClient = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string>("__none__");

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: queryKeys.orgs.all,
    queryFn: () => apiFetch<{ items: OrgOut[] }>("/api/v1/orgs"),
  });

  const {
    data: userOrg,
    isLoading: userOrgLoading,
    isError: userOrgIsError,
    error: userOrgError,
  } = useQuery({
    queryKey: queryKeys.users.org(userId),
    queryFn: async () => {
      try {
        return await apiFetch<OrgOut>(`/api/v1/users/${userId}/org`);
      } catch (err) {
        if (err instanceof ApiRequestError && err.code === "USER_ORG_NOT_SET") {
          return null;
        }
        throw err;
      }
    },
  });

  useEffect(() => {
    setSelectedOrgId(userOrg?.id ?? "__none__");
  }, [userOrg?.id]);

  const saveOrgMutation = useMutation({
    mutationFn: async () => {
      if (selectedOrgId === "__none__") {
        await apiFetch(`/api/v1/users/${userId}/org`, { method: "DELETE" });
        return;
      }
      await apiFetch(`/api/v1/users/${userId}/org`, {
        method: "PUT",
        body: JSON.stringify({ org_node_id: selectedOrgId }),
      });
    },
    onSuccess: async () => {
      toast.success("组织归属已更新");
      onActionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.org(userId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => onActionError(mapUserError(err)),
  });

  const orgItems = orgs?.items ?? [];

  return (
    <div className="grid gap-2">
      <Label htmlFor="user-org">所属组织</Label>
      {orgsLoading || userOrgLoading ? (
        <Skeleton className="h-11 w-full" />
      ) : userOrgIsError && !(userOrgError instanceof ApiRequestError) ? (
        <p className="text-theme-xs text-error-600">{mapApiError(userOrgError)}</p>
      ) : (
        <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
          <SelectTrigger id="user-org" aria-label="选择组织">
            <SelectValue placeholder="未分配组织" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">（未分配）</SelectItem>
            {orgItems.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name} ({org.path})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={saveOrgMutation.isPending || orgsLoading || userOrgLoading}
        onClick={() => saveOrgMutation.mutate()}
      >
        {saveOrgMutation.isPending ? "保存中…" : "保存组织归属"}
      </Button>
    </div>
  );
}
