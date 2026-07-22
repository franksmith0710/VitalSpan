export const CARTESIAN_MARGIN = { top: 24, right: 20, bottom: 44, left: 52 };

type MarginOverrides = Partial<typeof CARTESIAN_MARGIN>;

export function cartesianMargin(showLegend: boolean, overrides?: MarginOverrides): typeof CARTESIAN_MARGIN {
  return {
    ...CARTESIAN_MARGIN,
    top: CARTESIAN_MARGIN.top + (showLegend ? 20 : 0),
    ...overrides,
  };
}

export const RADIAL_MARGIN = { top: 24, right: 20, bottom: 24, left: 20 };

export function radialMargin(showLegend: boolean): typeof RADIAL_MARGIN {
  return { ...RADIAL_MARGIN, top: RADIAL_MARGIN.top + (showLegend ? 24 : 0) };
}
