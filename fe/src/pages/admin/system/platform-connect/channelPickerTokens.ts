import type { EmailSmtpSlot } from "@/lib/emailSmtpSlots";
import type { ImChannel } from "@/lib/imChannels";
import { cn } from "@/lib/utils";

export type ChannelPickerToken = {
  label: string;
  iconIdle: string;
  iconActive: string;
  cardActive: string;
};

const PICKER_CARD_IDLE =
  "border-gray-200 bg-white hover:border-gray-300 hover:shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700";

export const EMAIL_SLOT_ICON: Record<EmailSmtpSlot, ChannelPickerToken> = {
  qq: {
    label: "QQ",
    iconIdle:
      "bg-sky-100 text-sky-700 ring-1 ring-sky-200/80 group-hover:bg-sky-200/90 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/25",
    iconActive: "bg-sky-500 text-white shadow-theme-xs",
    cardActive:
      "border-sky-300 bg-sky-50/60 shadow-theme-sm ring-1 ring-sky-500/15 dark:border-sky-500/35 dark:bg-sky-500/10",
  },
  "163": {
    label: "163",
    iconIdle:
      "bg-rose-100 text-rose-700 ring-1 ring-rose-200/80 group-hover:bg-rose-200/90 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/25",
    iconActive: "bg-rose-500 text-white shadow-theme-xs",
    cardActive:
      "border-rose-300 bg-rose-50/60 shadow-theme-sm ring-1 ring-rose-500/15 dark:border-rose-500/35 dark:bg-rose-500/10",
  },
};

export const IM_CHANNEL_ICON: Record<ImChannel, ChannelPickerToken> = {
  wecom: {
    label: "微",
    iconIdle:
      "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80 group-hover:bg-emerald-200/90 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25",
    iconActive: "bg-emerald-500 text-white shadow-theme-xs",
    cardActive:
      "border-emerald-300 bg-emerald-50/60 shadow-theme-sm ring-1 ring-emerald-500/15 dark:border-emerald-500/35 dark:bg-emerald-500/10",
  },
  dingtalk: {
    label: "钉",
    iconIdle:
      "bg-blue-100 text-blue-700 ring-1 ring-blue-200/80 group-hover:bg-blue-200/90 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25",
    iconActive: "bg-blue-500 text-white shadow-theme-xs",
    cardActive:
      "border-blue-300 bg-blue-50/60 shadow-theme-sm ring-1 ring-blue-500/15 dark:border-blue-500/35 dark:bg-blue-500/10",
  },
  feishu: {
    label: "飞",
    iconIdle:
      "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200/80 group-hover:bg-indigo-200/90 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/25",
    iconActive: "bg-indigo-500 text-white shadow-theme-xs",
    cardActive:
      "border-indigo-300 bg-indigo-50/60 shadow-theme-sm ring-1 ring-indigo-500/15 dark:border-indigo-500/35 dark:bg-indigo-500/10",
  },
};

const ICON_BASE =
  "flex size-8 shrink-0 items-center justify-center rounded-lg text-theme-xs font-semibold transition-colors";

export function channelPickerCardClass(token: ChannelPickerToken, active: boolean) {
  return cn(
    "group relative flex w-full items-start justify-between gap-2 rounded-xl border p-3 text-left transition-all",
    active ? token.cardActive : PICKER_CARD_IDLE,
  );
}

export function channelPickerIconClass(token: ChannelPickerToken, active: boolean) {
  return cn(ICON_BASE, active ? token.iconActive : token.iconIdle);
}
