import { History, RefreshCw, Settings2 } from "lucide-react";
import { PanelEmptyState, PanelEmptyStateSteps } from "@/components/ui/panel-empty-state";

const STEPS = [
  {
    step: 1,
    title: "配置源库连接",
    description: "填写 MySQL 源库地址、账号密码与待同步源表。",
    icon: Settings2,
  },
  {
    step: 2,
    title: "设置目标与清洗",
    description: "指定托管分析库目标表、定时计划与 ETL 列映射规则。",
    icon: RefreshCw,
  },
  {
    step: 3,
    title: "运行并监控",
    description: "手动或定时触发全量同步，在历史记录中查看执行结果。",
    icon: History,
  },
] as const;

export function SyncJobsEmptyState() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
      <PanelEmptyState
        icon={<RefreshCw className="size-7" aria-hidden />}
        title="暂无同步任务"
        description="将业务源库数据全量同步到托管分析库，供仪表板与查询使用。点击右上角「新建任务」开始配置。"
        size="lg"
        footer={
          <div className="border-t border-gray-200 px-6 pb-6 pt-2 dark:border-gray-800">
            <PanelEmptyStateSteps steps={STEPS} />
          </div>
        }
      />
    </div>
  );
}
