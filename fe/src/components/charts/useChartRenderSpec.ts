import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { chartRenderSpecKey } from "@/lib/chartRenderSpecKey";
import {
  isAdvancedEchartsType,
  isKpiType,
  type ChartViewConfig,
} from "@/lib/chartViewConfig";
import type { RenderSpec } from "./adapters/renderFromSpec";

const specCache = new Map<string, RenderSpec>();
const inflight = new Map<string, Promise<RenderSpec>>();

async function loadRenderSpec(config: ChartViewConfig, key: string): Promise<RenderSpec> {
  const cached = specCache.get(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = apiFetch<RenderSpec>("/api/v1/charts/render-spec", {
    method: "POST",
    body: JSON.stringify(config),
  })
    .then((spec) => {
      specCache.set(key, spec);
      inflight.delete(key);
      return spec;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, request);
  return request;
}

type UseChartRenderSpecOptions = {
  /** 拖拽/缩放中暂停请求，松手后用缓存 */
  paused?: boolean;
  /** 数据查询中不发起新请求（配置未变时用缓存） */
  loading?: boolean;
  error?: string | null;
};

export function useChartRenderSpec(
  config: ChartViewConfig,
  options: UseChartRenderSpecOptions = {},
) {
  const { paused = false, loading = false, error = null } = options;
  const specKey = useMemo(() => chartRenderSpecKey(config), [config]);
  const needsSpec = !isKpiType(config.chartType) && isAdvancedEchartsType(config.chartType);
  const [renderSpec, setRenderSpec] = useState<RenderSpec | null>(() =>
    needsSpec ? (specCache.get(specKey) ?? null) : null,
  );

  useEffect(() => {
    if (!needsSpec) {
      setRenderSpec(null);
      return;
    }
    if (paused || loading || error) return;

    const cached = specCache.get(specKey);
    if (cached) {
      setRenderSpec(cached);
      return;
    }

    let cancelled = false;
    void loadRenderSpec(config, specKey)
      .then((spec) => {
        if (!cancelled) setRenderSpec(spec);
      })
      .catch(() => {
        if (!cancelled) setRenderSpec(null);
      });

    return () => {
      cancelled = true;
    };
  }, [config, error, loading, needsSpec, paused, specKey]);

  return renderSpec;
}

/** @internal vitest only */
export function clearChartRenderSpecCacheForTests() {
  specCache.clear();
  inflight.clear();
}
