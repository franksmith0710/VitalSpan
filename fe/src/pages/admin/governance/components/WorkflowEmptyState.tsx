import { Workflow } from "lucide-react";
import { PanelEmptyState } from "@/components/ui/panel-empty-state";

export function WorkflowEmptyState() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <PanelEmptyState
        icon={<Workflow className="size-7" aria-hidden />}
        title="暂无工单模板"
        description="治理域尚未注册标准查询发布等工作流模板。模板定义节点状态与负责角色，供工单实例流转使用。"
        size="lg"
        variant="plain"
      />
    </div>
  );
}
