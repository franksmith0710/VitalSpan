import { useEffect, useState } from "react";
import type { ChartDrillFrame } from "@/lib/chartDrill";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  resolveGeoMapLevelContext,
  type GeoMapLevelContext,
} from "@/lib/geoMapLevels";
import { VS_REGIONS_MAP_ID, listVsRegionNames } from "@/lib/geoMapChart";

const PROVINCE_CONTEXT: GeoMapLevelContext = {
  mapId: VS_REGIONS_MAP_ID,
  knownRegionNames: listVsRegionNames(),
  drillDepth: 0,
  levelLabel: "省级",
};

type Options = {
  enabled: boolean;
  config?: ChartViewConfig;
  drillStack: ChartDrillFrame[];
};

export function useGeoMapLevel({ enabled, config, drillStack }: Options) {
  const [context, setContext] = useState<GeoMapLevelContext>(PROVINCE_CONTEXT);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);
  const stackKey = drillStack.map((frame) => `${frame.field}:${frame.value}`).join("|");

  useEffect(() => {
    if (!enabled || !config) {
      setContext(PROVINCE_CONTEXT);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void resolveGeoMapLevelContext({ config, drillStack }).then((next) => {
      if (cancelled) return;
      setContext(next);
      setVersion((v) => v + 1);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, config, stackKey]);

  return { context, loading, version };
}
