import { useMemo } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { analyzeGeoMapMatch } from "@/components/charts/engine/geo/geoMapChart";
import { useChartExecute } from "@/components/charts/useChartExecute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  patchChartDeStyleNested,
  readChartDeStyle,
  readChartGeoStyle,
  type ChartGeoAreaMappingEntry,
} from "@/lib/chartDeStyle";
import { buildAreaMappingLookup } from "@/lib/chartGeoAreaMapping";
import {
  buildAreaMappingImportRows,
  countImportableUnmatchedValues,
  listUnmatchedGeoRegionValues,
} from "@/lib/geoAreaMappingFromData";
import { isChartExecuteReady } from "@/lib/chartExecuteProbe";
import { listOfflineProvinceNames } from "@/lib/geoMapLevels";
import { cn } from "@/lib/utils";
import { useChartInspector } from "./chartInspectorContext";
import {
  INSPECTOR_CTRL,
  INSPECTOR_HINT,
  INSPECTOR_SECTION_GAP,
  INSPECTOR_SELECT_TRIGGER,
  InspectorSubtleEmpty,
} from "./inspectorCompact";

const PROVINCE_NAMES = listOfflineProvinceNames();
const UNSET_REGION = "__unset__";

function newMappingId(): string {
  return crypto.randomUUID();
}

function AreaMappingTableRow({
  entry,
  onChange,
  onRemove,
}: {
  entry: ChartGeoAreaMappingEntry;
  onChange: (next: ChartGeoAreaMappingEntry) => void;
  onRemove: () => void;
}) {
  const listId = `geo-area-mapping-to-${entry.id}`;
  const useProvinceSelect = !entry.to || PROVINCE_NAMES.includes(entry.to);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_28px] items-center gap-1.5 px-2 py-1">
      <Input
        className={cn(INSPECTOR_CTRL, "min-w-0")}
        value={entry.from}
        placeholder="业务取值"
        aria-label="业务值"
        onChange={(e) => onChange({ ...entry, from: e.target.value })}
      />
      {useProvinceSelect ? (
        <Select
          value={entry.to || UNSET_REGION}
          onValueChange={(value) => {
            if (value === UNSET_REGION) return;
            onChange({ ...entry, to: value });
          }}
        >
          <SelectTrigger className={INSPECTOR_SELECT_TRIGGER} aria-label="地图区域">
            <SelectValue placeholder="选择省/市" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNSET_REGION} disabled>
              选择省/市
            </SelectItem>
            {PROVINCE_NAMES.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          className={cn(INSPECTOR_CTRL, "min-w-0")}
          list={listId}
          value={entry.to}
          placeholder="标准市/区名"
          aria-label="地图区域"
          onChange={(e) => onChange({ ...entry, to: e.target.value })}
        />
      )}
      <datalist id={listId}>
        {PROVINCE_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0 text-gray-400"
        aria-label="删除映射"
        onClick={onRemove}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

/** 2D/3D 区域地图 · 高级「地名映射」（对标 DataEase MapMapping 表格交互） */
export function ChartAdvancedMapAreaMappingSection() {
  const { cfg, onChange } = useChartInspector();
  const geo = readChartGeoStyle(readChartDeStyle(cfg));
  const entries = geo.areaMapping ?? [];
  const regionField = cfg.dimensions?.[0]?.field ?? "";
  const executeReady = isChartExecuteReady(cfg);

  const { columns, rows, loading, error } = useChartExecute(cfg, { enabled: executeReady });

  const patchEntries = (next: ChartGeoAreaMappingEntry[]) =>
    onChange(patchChartDeStyleNested(cfg, "geo", { areaMapping: next }));

  const lookup = useMemo(() => buildAreaMappingLookup(entries), [entries]);

  const matchStats = useMemo(() => {
    if (!regionField || !rows.length || columns.indexOf(regionField) < 0) return null;
    return analyzeGeoMapMatch(rows, columns, regionField, undefined, 0, lookup);
  }, [regionField, rows, columns, lookup]);

  const importableCount = useMemo(() => {
    if (!regionField || !rows.length || columns.indexOf(regionField) < 0) return 0;
    return countImportableUnmatchedValues(rows, columns, regionField, entries);
  }, [regionField, rows, columns, entries]);

  const unmatchedUniqueCount = useMemo(() => {
    if (!regionField || !rows.length || columns.indexOf(regionField) < 0) return 0;
    return listUnmatchedGeoRegionValues(rows, columns, regionField, lookup).length;
  }, [regionField, rows, columns, lookup]);

  const handleImportUnmatched = () => {
    if (!regionField || importableCount === 0) return;
    const unmatched = listUnmatchedGeoRegionValues(rows, columns, regionField, lookup);
    patchEntries(buildAreaMappingImportRows(entries, unmatched, newMappingId));
  };

  return (
    <div className={INSPECTOR_SECTION_GAP}>
      <div className="flex items-start justify-between gap-2 rounded-md border border-gray-200 bg-gray-50/80 px-2 py-1.5 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className={cn(INSPECTOR_HINT, "min-w-0 flex-1 pt-0.5")}>
          {!regionField
            ? "请先在数据 Tab 绑定地理维度字段"
            : loading
              ? "正在加载预览数据…"
              : error
                ? "预览数据不可用，仍可手动添加映射"
                : matchStats
                  ? matchStats.total > 0
                    ? (
                        <>
                          已匹配 {matchStats.matched}/{matchStats.total} 条
                          {unmatchedUniqueCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-500">
                              {" "}
                              · {unmatchedUniqueCount} 个取值未匹配
                            </span>
                          ) : null}
                        </>
                      )
                    : "当前数据为空"
                  : executeReady
                    ? "等待预览数据"
                    : "配置数据源后可查看匹配状态"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 px-2 text-[10px]"
          disabled={!regionField || loading || importableCount === 0}
          onClick={handleImportUnmatched}
        >
          <Download className="mr-1 size-3" aria-hidden />
          导入未匹配{importableCount > 0 ? ` (${importableCount})` : ""}
        </Button>
      </div>

      <p className={INSPECTOR_HINT}>
        将业务维度值映射为标准省/市名称后再与离线地图 join。省级请从下拉选择；下钻至市级后请手填 GeoJSON
        标准名称。
      </p>

      {entries.length === 0 ? (
        <InspectorSubtleEmpty message="暂无映射。可手动添加，或从当前数据一键导入未匹配取值。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_28px] gap-1.5 border-b border-gray-200 bg-gray-50/90 px-2 py-1.5 text-[10px] font-medium text-gray-500 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-400">
            <span>数据值</span>
            <span>地图区域</span>
            <span className="sr-only">操作</span>
          </div>
          {entries.map((entry) => (
            <AreaMappingTableRow
              key={entry.id}
              entry={entry}
              onChange={(next) =>
                patchEntries(entries.map((item) => (item.id === entry.id ? next : item)))
              }
              onRemove={() => patchEntries(entries.filter((item) => item.id !== entry.id))}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-full"
        onClick={() => patchEntries([...entries, { id: newMappingId(), from: "", to: "" }])}
      >
        <Plus className="mr-1 size-3.5" aria-hidden />
        添加映射
      </Button>
    </div>
  );
}
