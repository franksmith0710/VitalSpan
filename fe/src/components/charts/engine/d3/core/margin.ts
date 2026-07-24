export const CARTESIAN_MARGIN = { top: 24, right: 20, bottom: 44, left: 52 };

type MarginOverrides = Partial<typeof CARTESIAN_MARGIN>;

/** 基础笛卡尔边距；图例占位请用 reserveLegendMargin */
export function cartesianMargin(_showLegend = false, overrides?: MarginOverrides): typeof CARTESIAN_MARGIN {
  return {
    ...CARTESIAN_MARGIN,
    ...overrides,
  };
}

export const RADIAL_MARGIN = { top: 24, right: 20, bottom: 24, left: 20 };

export function radialMargin(_showLegend = false): typeof RADIAL_MARGIN {
  return { ...RADIAL_MARGIN };
}
