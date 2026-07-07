import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
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
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-2">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex items-center gap-2">
            <div className="flex w-[132px] flex-col items-center rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-4 text-center dark:border-gray-800 dark:bg-white/[0.02]">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-500 text-theme-xs font-semibold text-white">
                {index + 1}
              </span>
              <p className="mt-2 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {nodeLabel(node.id)}
              </p>
              <Badge variant="light" color="primary" size="sm" className="mt-2">
                {roleLabel(node.role)}
              </Badge>
            </div>
            {index < nodes.length - 1 ? (
              <ChevronRight className="size-4 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
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
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="min-w-[640px] w-full text-left text-theme-sm">
        <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <tr>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">序号</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">节点</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">标识</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">负责角色</th>
            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">说明</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-3" colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            : null}
          {!loading
            ? nodes.map((node, index) => (
                <tr
                  key={node.id}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white/90">
                    {nodeLabel(node.id)}
                  </td>
                  <td className="px-4 py-3 font-mono text-theme-xs text-gray-600 dark:text-gray-300">
                    {node.id}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="light" color="primary" size="sm">
                      {roleLabel(node.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {descByNode.get(node.id) ?? "—"}
                  </td>
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
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

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b border-gray-200 px-6 py-5 dark:border-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-theme-lg font-semibold text-gray-900 dark:text-white">
              {template.name}
            </h2>
            <p className="mt-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
              {template.id}
            </p>
          </div>
          <Badge variant="light" color={template.id.startsWith("custom_") ? "primary" : "success"} size="sm">
            {template.id.startsWith("custom_") ? "自定义模板" : "内置模板"}
          </Badge>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <ArrowRight className="size-4 text-brand-500" aria-hidden />
            <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              流程节点
            </h3>
          </div>
          <NodePipeline nodes={template.nodes} />
        </section>

        <section>
          <h3 className="mb-3 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            节点角色配置
          </h3>
          <NodeRolesTable
            nodes={template.nodes}
            descriptions={rolesQuery.data ?? []}
            loading={rolesQuery.isLoading}
          />
        </section>
      </div>
    </div>
  );
}
