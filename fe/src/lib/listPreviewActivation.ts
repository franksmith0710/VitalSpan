/** 列表卡片 live 预览全局并发上限（仪表板/模板等共用；≈首屏一行网格） */
export const MAX_LIST_PREVIEW_ACTIVATIONS = 3;

let activeCount = 0;
let slotEpoch = 0;
const waitQueue: Array<() => void> = [];

export class ListPreviewSlotResetError extends Error {
  constructor() {
    super("list-preview-slot-reset");
    this.name = "ListPreviewSlotResetError";
  }
}

export function requestListPreviewSlot(): Promise<void> {
  const epoch = slotEpoch;
  if (activeCount < MAX_LIST_PREVIEW_ACTIVATIONS) {
    activeCount += 1;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    waitQueue.push(() => {
      if (epoch !== slotEpoch) {
        reject(new ListPreviewSlotResetError());
        return;
      }
      activeCount += 1;
      resolve();
    });
  });
}

export function releaseListPreviewSlot(): void {
  activeCount = Math.max(0, activeCount - 1);
  const next = waitQueue.shift();
  if (next) next();
}

/** 导航切换时清空排队，避免旧页预览占用 slot */
export function releaseAllListPreviewSlots(): void {
  activeCount = 0;
  slotEpoch += 1;
  while (waitQueue.length > 0) {
    const next = waitQueue.shift();
    if (next) next();
  }
}

export function resetListPreviewActivationForTests(): void {
  activeCount = 0;
  slotEpoch = 0;
  waitQueue.length = 0;
}

export function getActiveListPreviewCountForTests(): number {
  return activeCount;
}
