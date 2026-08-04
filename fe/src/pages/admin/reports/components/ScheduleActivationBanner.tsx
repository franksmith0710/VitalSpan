import { Button } from "@/components/ui/button";

type ScheduleActivationBannerProps = {
  onActivate: () => void;
  activating?: boolean;
  disabled?: boolean;
};

export function ScheduleActivationBanner({
  onActivate,
  activating,
  disabled,
}: ScheduleActivationBannerProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p className="text-theme-sm text-gray-700 dark:text-gray-300">
        已创建草稿，<strong>点击激活后才会按时发送</strong>邮件。
      </p>
      <Button
        type="button"
        variant="primary"
        size="sm"
        disabled={disabled || activating}
        onClick={onActivate}
      >
        {activating ? "激活中…" : "立即激活"}
      </Button>
    </div>
  );
}
