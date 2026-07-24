export type ChartMountState = "waiting" | "mounting" | "ready";

type MountEntry = {
  widgetId: string;
  priority: number;
  inView: boolean;
  state: ChartMountState;
};

/** 限制同时进入重渲染阶段的 widget 数量；完成后释放 slot 供队列下一个使用 */
export class ChartMountScheduler {
  private maxConcurrent: number;
  private mounting = new Set<string>();
  private entries = new Map<string, MountEntry>();
  private listeners = new Set<() => void>();

  constructor(maxConcurrent: number) {
    this.maxConcurrent = Math.max(1, maxConcurrent);
  }

  setMaxConcurrent(maxConcurrent: number): void {
    this.maxConcurrent = Math.max(1, maxConcurrent);
    this.preemptForPriority();
    this.drain();
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  register(widgetId: string, priority: number, inView: boolean): void {
    const existing = this.entries.get(widgetId);
    if (existing) {
      existing.priority = priority;
      existing.inView = inView;
      if (!inView && existing.state === "mounting") {
        this.mounting.delete(widgetId);
        existing.state = "waiting";
      }
    } else {
      this.entries.set(widgetId, { widgetId, priority, inView, state: "waiting" });
    }
    this.preemptForPriority();
    this.drain();
    this.notify();
  }

  unregister(widgetId: string): void {
    const entry = this.entries.get(widgetId);
    if (entry?.state === "mounting") {
      this.mounting.delete(widgetId);
    }
    this.entries.delete(widgetId);
    this.drain();
    this.notify();
  }

  markReady(widgetId: string): void {
    const entry = this.entries.get(widgetId);
    if (!entry || entry.state !== "mounting") return;
    this.mounting.delete(widgetId);
    entry.state = "ready";
    this.drain();
    this.notify();
  }

  getGate(widgetId: string): { canQuery: boolean; canRender: boolean } {
    const entry = this.entries.get(widgetId);
    if (!entry || !entry.inView) {
      return { canQuery: false, canRender: false };
    }
    if (entry.state === "ready" || entry.state === "mounting") {
      return { canQuery: true, canRender: true };
    }
    return { canQuery: false, canRender: false };
  }

  /** 视口内 widget 均已 ready（用于缩略图截取前等待） */
  isInViewSettled(): boolean {
    for (const entry of this.entries.values()) {
      if (entry.inView && entry.state !== "ready") return false;
    }
    return true;
  }

  waitForInViewSettled(timeoutMs = 15_000): Promise<void> {
    if (this.isInViewSettled()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        if (this.isInViewSettled()) {
          cleanup();
          resolve();
        } else if (Date.now() > deadline) {
          cleanup();
          reject(new Error("ChartMountScheduler drain timeout"));
        }
      };
      const unsubscribe = this.subscribe(tick);
      const timer = window.setInterval(tick, 100);
      const cleanup = () => {
        unsubscribe();
        window.clearInterval(timer);
      };
      tick();
    });
  }

  private drain(): void {
    const waiting = [...this.entries.values()]
      .filter((entry) => entry.inView && entry.state === "waiting")
      .sort(
        (a, b) =>
          a.priority - b.priority || a.widgetId.localeCompare(b.widgetId),
      );

    for (const entry of waiting) {
      if (this.mounting.size >= this.maxConcurrent) break;
      entry.state = "mounting";
      this.mounting.add(entry.widgetId);
    }
  }

  private preemptForPriority(): void {
    const waiting = [...this.entries.values()].filter(
      (entry) => entry.inView && entry.state === "waiting",
    );
    if (waiting.length === 0) return;

    const bestWaitingPriority = Math.min(...waiting.map((entry) => entry.priority));
    for (const entry of this.entries.values()) {
      if (entry.state === "mounting" && entry.priority > bestWaitingPriority) {
        entry.state = "waiting";
        this.mounting.delete(entry.widgetId);
      }
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
