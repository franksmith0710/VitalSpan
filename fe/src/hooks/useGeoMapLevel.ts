import { useEffect, useState } from "react";
import type { ChartDrillFrame } from "@/lib/chartDrill";
import type { ChartViewConfig } from "@/lib/chartViewConfig";
import {
  resolveGeoMapLevelContext,
  type GeoMapLevelContext,
} from "@/lib/geoMapLevels";
import { VS_REGIONS_MAP_ID, listVsRegionNames } from "@/lib/geoMapChart";

function createProvinceContext(): GeoMapLevelContext {
  return {
    mapId: VS_REGIONS_MAP_ID,
    knownRegionNames: listVsRegionNames(),
    drillDepth: 0,
    levelLabel: "省级",
  };
}

type Options = {
  enabled: boolean;
  config?: ChartViewConfig;
  drillStack: ChartDrillFrame[];
};

/** 地图层级已解析且与下钻栈深度一致（失败时带 missingAsset 也算就绪） */
export function isGeoMapLevelReady(
  drillStack: ChartDrillFrame[],
  level: GeoMapLevelContext,
  resolving: boolean,
): boolean {
  if (resolving) return false;
  if (drillStack.length === 0) return level.drillDepth === 0;
  if (level.missingAsset) return true;
  return level.drillDepth === drillStack.length;
}

export function useGeoMapLevel({ enabled, config, drillStack }: Options) {
  const [context, setContext] = useState<GeoMapLevelContext>(createProvinceContext);
  const [version, setVersion] = useState(0);
  const stackKey = drillStack.map((frame) => `${frame.field}:${frame.value}`).join("|");
  const [resolvedStackKey, setResolvedStackKey] = useState("");

  const resolving = Boolean(enabled && config && stackKey !== resolvedStackKey);

  useEffect(() => {
    if (!enabled || !config) {
      setContext(createProvinceContext());
      setResolvedStackKey("");
      return;
    }

    let cancelled = false;
    void resolveGeoMapLevelContext({ config, drillStack }).then((next) => {
      if (cancelled) return;
      setContext(next);
      setResolvedStackKey(stackKey);
      setVersion((v) => v + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, config, stackKey]);

  return { context, loading: resolving, version };
}
