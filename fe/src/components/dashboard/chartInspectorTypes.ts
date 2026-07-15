export type SlotTarget =
  | { kind: "dimension"; index: number }
  | { kind: "metric"; index: number };
