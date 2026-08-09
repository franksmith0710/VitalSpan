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

type OrgTreeRowsProps = {
  items: OrgOut[];
  parentId: string | null;
  depth: number;
  batchMode?: boolean;
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string) => void;
  onEdit: (org: OrgOut) => void;
  onDelete: (org: OrgOut) => void;
};

export function OrgTreeRows({
  items,
  parentId,
  depth,
  batchMode = false,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}: OrgTreeRowsProps) {
  const children = items.filter((o) => o.parent_id === parentId);
  if (children.length === 0) return null;
  return (
    <ul className={cn(depth > 0 && "ml-4 border-l border-gray-200 pl-3 dark:border-gray-800")}>
      {children.map((org) => (
        <li key={org.id} className="py-1">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.03]">
            {batchMode && isSelected && onToggleSelect ? (
              <ListRowCheckbox
                checked={isSelected(org.id)}
                onCheckedChange={() => onToggleSelect(org.id)}
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
          <OrgTreeRows
            items={items}
            parentId={org.id}
            depth={depth + 1}
            batchMode={batchMode}
            isSelected={isSelected}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  );
}
