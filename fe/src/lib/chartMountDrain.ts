import type { ChartMountScheduler } from "@/lib/chartMountScheduler";

let activeScheduler: ChartMountScheduler | null = null;

export function registerActiveChartMountScheduler(
  scheduler: ChartMountScheduler | null,
): void {
  activeScheduler = scheduler;
}

/**
 * 尽力等待可见图表挂载完成（缩略图截取前）。
 * 超时或调度器未就绪时不抛错，避免阻塞布局保存主路径。
 */
export async function waitForActiveChartMountDrain(timeoutMs = 8_000): Promise<void> {
  if (!activeScheduler) return;
  try {
    await activeScheduler.waitForInViewSettled(timeoutMs);
  } catch {
    // best-effort：队列未排空时仍继续截图
  }
}
