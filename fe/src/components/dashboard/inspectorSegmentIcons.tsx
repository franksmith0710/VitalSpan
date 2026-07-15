import type { ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
} from "lucide-react";

export const SEGMENT_ICON_CLASS = "size-3.5 shrink-0";

export type InspectorSegmentOption = {
  value: string;
  label: ReactNode;
  ariaLabel: string;
  disabled?: boolean;
};

/** 文本水平对齐：左 / 中 / 右（对标 DE + RichTextToolbar） */
export const HORIZONTAL_ALIGN_SEGMENT_OPTIONS: InspectorSegmentOption[] = [
  {
    value: "left",
    label: <AlignLeft className={SEGMENT_ICON_CLASS} aria-hidden />,
    ariaLabel: "左对齐",
  },
  {
    value: "center",
    label: <AlignCenter className={SEGMENT_ICON_CLASS} aria-hidden />,
    ariaLabel: "居中对齐",
  },
  {
    value: "right",
    label: <AlignRight className={SEGMENT_ICON_CLASS} aria-hidden />,
    ariaLabel: "右对齐",
  },
];

/** 图例位置：上 / 下 / 左 / 右 */
export const LEGEND_POSITION_SEGMENT_OPTIONS: InspectorSegmentOption[] = [
  {
    value: "top",
    label: <PanelTop className={SEGMENT_ICON_CLASS} aria-hidden />,
    ariaLabel: "图例在上",
  },
  {
    value: "bottom",
    label: <PanelBottom className={SEGMENT_ICON_CLASS} aria-hidden />,
    ariaLabel: "图例在下",
  },
  {
    value: "left",
    label: <PanelLeft className={SEGMENT_ICON_CLASS} aria-hidden />,
    ariaLabel: "图例在左",
  },
  {
    value: "right",
    label: <PanelRight className={SEGMENT_ICON_CLASS} aria-hidden />,
    ariaLabel: "图例在右",
  },
];
