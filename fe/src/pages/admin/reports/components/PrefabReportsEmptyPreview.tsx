import { Link } from "react-router";
import { BarChart3, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListGhostEmptyState, PanelEmptyStateSteps } from "@/components/ui/panel-empty-state";

type PrefabReportsEmptyPreviewProps = {
  isAdmin?: boolean;
  onConfigure?: () => void;
};

const ADMIN_STEPS = [
  {
    step: 1,
    title: "定义绑定键",
    description: "为预制分析指定唯一标识，便于 Hub 与深链跳转。",
    icon: Settings2,
  },
  {
    step: 2,
    title: "关联实体与分析",
    description: "选择实体类型与分析模型（生命周期、趋势等）。",
    icon: BarChart3,
  },
  {
    step: 3,
    title: "保存并运行",
    description: "保存绑定后，列表将出现可运行的预制报表。",
    icon: BarChart3,
  },
] as const;

export function PrefabReportsEmptyPreview({ isAdmin, onConfigure }: PrefabReportsEmptyPreviewProps) {
  return (
    <ListGhostEmptyState
      icon={<BarChart3 className="size-7" aria-hidden />}
      title="暂无预制报表"
      description={
        isAdmin
          ? "尚未配置系统预置分析。展开下方「预制绑定配置」添加首条绑定后即可运行。"
          : "系统预置的分析报表尚未配置，请联系管理员添加实体与分析类型绑定。"
      }
      headingId="prefab-empty-title"
      layout="cards"
      rows={6}
      action={
        isAdmin ? (
          <Button type="button" variant="primary" size="sm" onClick={onConfigure}>
            配置首条绑定
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link to="/admin/reports/center">返回全部报表</Link>
          </Button>
        )
      }
    />
  );
}

export function PrefabReportsAdminSteps() {
  return <PanelEmptyStateSteps steps={ADMIN_STEPS} />;
}
