import { Link } from "react-router";
import { BarChart3, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelEmptyStateSteps, ListGhostEmptyState } from "@/components/ui/panel-empty-state";
import { PrefabBindingForm } from "./PrefabBindingForm";

type PrefabReportsEmptyPreviewProps = {
  isAdmin?: boolean;
};

const ADMIN_STEPS = [
  {
    step: 1,
    title: "准备演示数据",
    description: "开发环境在 .env 设置 DEV_REPORT_SEED=1 并重启后端，写入样例库、实体表与演示模板。",
    icon: Settings2,
  },
  {
    step: 2,
    title: "定义绑定键",
    description: "为预制分析指定唯一标识，便于 Hub 与深链跳转。",
    icon: Settings2,
  },
  {
    step: 3,
    title: "关联实体与分析",
    description: "选择实体类型与分析模型；实体表未注册时运行会提示「实体数据尚未就绪」。",
    icon: BarChart3,
  },
  {
    step: 4,
    title: "保存并运行",
    description: "保存绑定后，列表将出现可运行的预制报表。",
    icon: BarChart3,
  },
] as const;

/** 非管理员：ghost 背景空态 */
export function PrefabReportsEmptyPreview({ isAdmin }: PrefabReportsEmptyPreviewProps) {
  return (
    <ListGhostEmptyState
      layout="cards"
      density="compact"
      rows={4}
      icon={<BarChart3 className="size-8" aria-hidden />}
      title="暂无预制报表"
      description={
        isAdmin
          ? "尚未配置系统预置分析，请联系具备报表管理权限的管理员添加绑定。"
          : "系统预置的分析报表尚未配置，请联系管理员添加实体与分析类型绑定。"
      }
      headingId="prefab-empty-title"
      action={
        !isAdmin ? (
          <Button type="button" variant="primary" size="sm" asChild>
            <Link to="/admin/reports/center">返回全部报表</Link>
          </Button>
        ) : undefined
      }
    />
  );
}

/** 管理员首配：ghost 引导头 + 步骤 + 表单 Card */
export function PrefabReportsAdminOnboarding() {
  return (
    <div className="space-y-6">
      <ListGhostEmptyState
        layout="cards"
        density="compact"
        rows={4}
        icon={<BarChart3 className="size-8" aria-hidden />}
        title="暂无预制报表"
        description="完成下方绑定配置并保存后，即可在本页运行系统预置分析。"
        headingId="prefab-empty-title"
      />

      <section className="space-y-3">
        <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">配置步骤</h2>
        <PanelEmptyStateSteps steps={ADMIN_STEPS} />
      </section>

      <Card className="shadow-theme-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-theme-sm font-semibold">绑定配置</CardTitle>
          <CardDescription>填写标识、实体与分析维度，保存后即可运行预制分析。</CardDescription>
        </CardHeader>
        <CardContent>
          <PrefabBindingForm />
        </CardContent>
      </Card>
    </div>
  );
}
