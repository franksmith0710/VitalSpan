type InteractionListener = (seriesName: string | null, hidden: ReadonlySet<string>) => void;

const listeners = new Set<InteractionListener>();
let focusedSeries: string | null = null;
const hiddenSeries = new Set<string>();

export function subscribeSeriesFocus(listener: InteractionListener): () => void {
  listener(focusedSeries, hiddenSeries);
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSeriesFocus(seriesName: string | null): void {
  focusedSeries = seriesName;
  for (const fn of listeners) fn(seriesName, hiddenSeries);
}

export function toggleSeriesVisibility(seriesName: string): void {
  if (hiddenSeries.has(seriesName)) hiddenSeries.delete(seriesName);
  else hiddenSeries.add(seriesName);
  for (const fn of listeners) fn(focusedSeries, hiddenSeries);
}

export function resetSeriesInteraction(): void {
  focusedSeries = null;
  hiddenSeries.clear();
  for (const fn of listeners) fn(null, hiddenSeries);
}

export function getSeriesInteractionState(): {
  focused: string | null;
  hidden: ReadonlySet<string>;
} {
  return { focused: focusedSeries, hidden: hiddenSeries };
}

export function dimOpacity(active: boolean, dimmed: boolean, base = 0.92): number {
  if (!dimmed) return base;
  return active ? base : 0.25;
}

export function seriesVisible(seriesName: string, hidden: ReadonlySet<string>): boolean {
  return !hidden.has(seriesName);
}
