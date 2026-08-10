import { Building2, Pencil, Trash2 } from "lucide-react";
import { ListRowCheckbox } from "@/components/layout/list-batch-delete";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OrgOut = {
  id: string;
  parent_id: string | null;
  name: string;
  path: string;
  level: number;
};

type OrgListRowProps = {
  org: OrgOut;
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onEdit: (org: OrgOut) => void;
  onDelete: (org: OrgOut) => void;
};

export function OrgListRow({
  org,
  batchMode = false,
  isSelected = false,
  onToggleSelect,
  onEdit,
  onDelete,
}: OrgListRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.03]",
      )}
      style={{ paddingLeft: `${8 + org.level * 16}px` }}
    >
      {batchMode && onToggleSelect ? (
        <ListRowCheckbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect()}
          ariaLabel={`选择组织 ${org.name}`}
        />
      ) : null}
      <Building2 className="size-4 shrink-0 text-gray-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {org.name}
        </p>
        <p className="truncate font-mono text-theme-xs text-gray-500 dark:text-gray-400">
          {org.path}
        </p>
      </div>
      <span className="hidden text-theme-xs text-gray-400 sm:inline">L{org.level}</span>
      {!batchMode ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`编辑 ${org.name}`}
            onClick={() => onEdit(org)}
          >
            <Pencil className="size-4" />
          </IconButton>
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`删除 ${org.name}`}
            className="text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
            onClick={() => onDelete(org)}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}
