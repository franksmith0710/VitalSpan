import { BarChart3 } from "lucide-react";
import { ListGhostEmptyState } from "@/components/ui/panel-empty-state";

/** 报表列表卡片内容区的空态：骨架列表背景 + 居中说明卡片。 */
export function PrefabReportsEmptyPreview() {
  return (
    <ListGhostEmptyState
      icon={<BarChart3 className="size-7" aria-hidden />}
      title="暂无预制报表"
      description="系统预置的分析报表尚未配置，请联系管理员添加实体与分析类型绑定。"
      headingId="prefab-empty-title"
      rows={3}
    />
  );
}
