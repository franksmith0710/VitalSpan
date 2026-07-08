import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import {
  nodeLabel,
  roleLabel,
  type WorkflowNodeRole,
  type WorkflowTemplate,
} from "./workflow-labels";

type WorkflowTemplateDetailProps = {
  template: WorkflowTemplate;
};

function NodePipeline({ nodes }: { nodes: WorkflowTemplate["nodes"] }) {
  return (
    <div className="overflow-x-auto">
      <ol className="flex min-w-max items-stretch gap-3 pb-1">
        {nodes.map((node, index) => (
          <li key={node.id} className="flex items-stretch">
            <div className="flex w-[148px] flex-col rounded-xl border border-gray-200 bg-white p-4 text-center shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
              <span className="mx-auto flex size-8 items-center justify-center rounded-full bg-brand-500 text-theme-xs font-semibold text-white">
                {index + 1}
              </span>
              <p className="mt-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                {nodeLabel(node.id)}
              </p>
              <Badge variant="light" color="primary" size="sm" className="mt-2 self-center">
                {roleLabel(node.role)}
              </Badge>
            </div>
            {index < nodes.length - 1 ? (
              <div className="flex w-8 items-center justify-center" aria-hidden>
                <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function NodeRolesTable({
  nodes,
  descriptions,
  loading,
}: {
  nodes: WorkflowTemplate["nodes"];
  descriptions: WorkflowNodeRole[];
  loading: boolean;
}) {
  const descByNode = new Map(descriptions.map((d) => [d.nodeId, d.description]));

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50 hover:bg-gray-50 dark:bg-white/[0.02] dark:hover:bg-white/[0.02]">
            <TableHead className="w-16">序号</TableHead>
            <TableHead>节点</TableHead>
            <TableHead>标识</TableHead>
            <TableHead>负责角色</TableHead>
            <TableHead>说明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : null}
          {!loading
            ? nodes.map((node, index) => (
                <TableRow key={node.id}>
                  <TableCell className="text-gray-500 dark:text-gray-400">{index + 1}</TableCell>
                  <TableCell className="font-medium text-gray-800 dark:text-white/90">
                    {nodeLabel(node.id)}
                  </TableCell>
                  <TableCell className="font-mono text-theme-xs text-gray-600 dark:text-gray-300">
                    {node.id}
                  </TableCell>
                  <TableCell>
                    <Badge variant="light" color="primary" size="sm">
                      {roleLabel(node.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {descByNode.get(node.id) ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            : null}
        </TableBody>
      </Table>
    </div>
  );
}

function DetailSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02]", className)}>
      <div className="mb-4">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        {description ? (
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function WorkflowTemplateDetail({ template }: WorkflowTemplateDetailProps) {
  const rolesQuery = useQuery({
    queryKey: queryKeys.gov.workflowNodeRoles(template.id),
    queryFn: () =>
      apiFetch<{ items: WorkflowNodeRole[] }>(
        `/api/v1/gov/workflow/templates/${template.id}/node-roles`,
      ).then((r) => r.items),
  });

  const isCustom = template.id.startsWith("custom_");

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
            <Workflow className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-theme-lg font-semibold text-gray-900 dark:text-white">
                {template.name}
              </h2>
              <Badge variant="light" color={isCustom ? "primary" : "success"} size="sm">
                {isCustom ? "自定义模板" : "内置模板"}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
              {template.id}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
        <DetailSection title="流程节点" description="从左到右为工单流转顺序，每个节点绑定负责角色。">
          <NodePipeline nodes={template.nodes} />
        </DetailSection>

        <DetailSection title="节点角色配置" description="各节点的职责说明，供审批与设计环节参考。">
          <NodeRolesTable
            nodes={template.nodes}
            descriptions={rolesQuery.data ?? []}
            loading={rolesQuery.isLoading}
          />
        </DetailSection>
      </div>
    </div>
  );
}
