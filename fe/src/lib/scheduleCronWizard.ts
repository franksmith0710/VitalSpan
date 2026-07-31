export type ScheduleFrequency = "daily" | "weekly" | "monthly";

export type ScheduleWizardState = {
  frequency: ScheduleFrequency;
  hour: number;
  minute: number;
  weekday: number;
  dayOfMonth: number;
};

export const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function cronFromWizard(state: ScheduleWizardState): string {
  const { frequency, hour, minute, weekday, dayOfMonth } = state;
  if (frequency === "daily") {
    return `${minute} ${hour} * * *`;
  }
  if (frequency === "weekly") {
    return `${minute} ${hour} * * ${weekday}`;
  }
  return `${minute} ${hour} ${dayOfMonth} * *`;
}

export function describeCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dom, , dow] = parts;
  const time = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  if (dom === "*" && dow === "*") return `每天 ${time}`;
  if (dom === "*" && dow !== "*") {
    const idx = Number(dow);
    const label = WEEKDAY_LABELS[idx] ?? dow;
    return `每周${label} ${time}`;
  }
  if (dom !== "*" && dow === "*") return `每月 ${dom} 日 ${time}`;
  return cron;
}

export function parseCronToWizard(cron: string): ScheduleWizardState | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minS, hourS, dom, , dow] = parts;
  if (!/^\d+$/.test(minS) || !/^\d+$/.test(hourS)) return null;
  const minute = Number(minS);
  const hour = Number(hourS);
  if (dom === "*" && dow === "*") {
    return { frequency: "daily", hour, minute, weekday: 1, dayOfMonth: 1 };
  }
  if (dom === "*" && /^\d+$/.test(dow)) {
    return { frequency: "weekly", hour, minute, weekday: Number(dow), dayOfMonth: 1 };
  }
  if (/^\d+$/.test(dom) && dow === "*") {
    return { frequency: "monthly", hour, minute, weekday: 1, dayOfMonth: Number(dom) };
  }
  return null;
}
