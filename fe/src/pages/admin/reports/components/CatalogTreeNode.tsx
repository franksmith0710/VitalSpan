import { useState } from "react";
import { ChevronRight, FileText, Folder } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { type CatalogNode, useReportTemplates } from "../useReportTemplates";

export function CatalogTreeNode({
  node,
  selectedId,
  onSelect,
  depth = 0,
}: {
  node: CatalogNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(false);
  const isFolder = node.nodeType === "folder";
  const { nodesQuery } = useReportTemplates(isFolder && open ? node.id : null);
  const children = nodesQuery.data?.items ?? [];
  const selected = selectedId === node.id;

  if (!isFolder) {
    return (
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-theme-sm hover:bg-gray-50 dark:hover:bg-white/5 ${
          selected ? "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : ""
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node.id)}
        aria-expanded={false}
      >
        <FileText className="size-4 shrink-0" aria-hidden />
        <span className="truncate" title={node.name}>
          {node.name}
        </span>
      </button>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-theme-sm hover:bg-gray-50 dark:hover:bg-white/5"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        aria-expanded={open}
      >
        <ChevronRight className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <Folder className="size-4 shrink-0" aria-hidden />
        <span className="truncate font-medium" title={node.name}>
          {node.name}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5">
        {nodesQuery.isLoading ? <Skeleton className="mx-4 my-1 h-6 w-[calc(100%-2rem)]" /> : null}
        {children.map((child) => (
          <CatalogTreeNode
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
