import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-theme-xl font-semibold text-gray-900 dark:text-white">
          欢迎使用 VitalSpan
        </h1>
        <p className="mt-2 text-theme-sm text-gray-500 dark:text-gray-400">
          M1 管理端壳层已就绪。数据源与权限配置将在后续里程碑开放。
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
          壳层预览
        </h2>
        <div className="mt-4 grid max-w-md gap-3">
          <div className="space-y-2">
            <Label htmlFor="demo-input">示例输入</Label>
            <Input id="demo-input" placeholder="占位，无 API 联调" readOnly />
          </div>
          <Button type="button" variant="primary">
            主操作示例
          </Button>
        </div>
      </div>
    </div>
  );
}
