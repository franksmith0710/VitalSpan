const STORAGE_KEY = "vitalspan.reportCenter.pinnedPrefabs";

export function readPinnedPrefabKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writePinnedPrefabKeys(keys: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function togglePinnedPrefabKey(key: string): string[] {
  const current = readPinnedPrefabKeys();
  const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
  writePinnedPrefabKeys(next);
  return next;
}

export function sortPrefabsByPin<T extends { bindingKey: string }>(items: T[], pinned: string[]): T[] {
  if (pinned.length === 0) return items;
  const pinSet = new Set(pinned);
  return [...items].sort((a, b) => {
    const aPin = pinSet.has(a.bindingKey);
    const bPin = pinSet.has(b.bindingKey);
    if (aPin === bPin) return 0;
    return aPin ? -1 : 1;
  });
}
