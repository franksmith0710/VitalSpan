import { useState } from "react";
import { ChevronRight, FileSpreadsheet, FileText, FileType2, Folder } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type CatalogNode, useReportTemplates } from "../useReportTemplates";

const TEMPLATE_ICONS = {
  word: FileText,
  excel: FileSpreadsheet,
  pdf: FileType2,
} as const;

function TemplateIcon({ kind }: { kind: CatalogNode["templateKind"] }) {
  const Icon = kind ? TEMPLATE_ICONS[kind] : FileText;
  return <Icon className="size-4 shrink-0" aria-hidden />;
}

function treeItemClass(selected: boolean) {
  return cn(
    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-theme-sm transition-colors",
    "hover:bg-gray-100 focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-brand-500/10",
    "dark:hover:bg-white/[0.03]",
    selected && "bg-brand-50 font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
  );
}

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
  const indent = { paddingLeft: `${depth * 14 + 10}px` };

  if (!isFolder) {
    return (
      <button
        type="button"
        className={treeItemClass(selected)}
        style={indent}
        onClick={() => onSelect(node.id)}
        aria-current={selected ? "true" : undefined}
      >
        <TemplateIcon kind={node.templateKind} />
        <span className="truncate" title={node.name}>
          {node.name}
        </span>
      </button>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(treeItemClass(false), "font-medium text-gray-700 dark:text-gray-300")}
        style={indent}
        aria-expanded={open}
      >
        <ChevronRight
          className={cn("size-4 shrink-0 text-gray-400 transition-transform", open && "rotate-90")}
          aria-hidden
        />
        <Folder className="size-4 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
        <span className="truncate" title={node.name}>
          {node.name}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5">
        {nodesQuery.isLoading ? <Skeleton className="mx-3 my-1 h-8 w-[calc(100%-1.5rem)] rounded-lg" /> : null}
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
