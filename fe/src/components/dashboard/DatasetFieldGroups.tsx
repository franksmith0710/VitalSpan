import { useMemo, useState } from "react";
import { Calendar, GripVertical, Hash, RefreshCw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { cn } from "@/lib/utils";
import { FIELD_DRAG_MIME } from "@/lib/chartFieldDrag";
import {
  fieldDisplayKind,
  groupDatasetFields,
} from "./datasetFieldClassification";

type DatasetFieldGroupsProps = {
  columns: string[];
  columnsLoading: boolean;
  columnsReady: boolean;
  datasetSelected: boolean;
  onFieldClick?: (fieldName: string) => void;
  onRefresh?: () => void;
  showHeader?: boolean;
};

function FieldIcon({ field }: { field: string }) {
  const kind = fieldDisplayKind(field);
  if (kind === "date") {
    return <Calendar className="size-3.5 text-brand-500" aria-hidden />;
  }
  if (kind === "number") {
    return <Hash className="size-3.5 text-success-500" aria-hidden />;
  }
  return <Type className="size-3.5 text-brand-500" aria-hidden />;
}

function FieldRow({
  field,
  onFieldClick,
}: {
  field: string;
  onFieldClick?: (fieldName: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(FIELD_DRAG_MIME, field);
          event.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => onFieldClick?.(field)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white dark:hover:bg-white/[0.06]"
      >
        <GripVertical className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-white/5">
          <FieldIcon field={field} />
        </span>
        <span className="min-w-0 flex-1 truncate text-theme-xs font-medium text-gray-800 dark:text-white/90">
          {field}
        </span>
      </button>
    </li>
  );
}

function FieldSection({
  title,
  fields,
  onFieldClick,
}: {
  title: string;
  fields: string[];
  onFieldClick?: (fieldName: string) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <section className="space-y-1">
      <h5 className="px-2 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
        {title}
      </h5>
      <ul className="space-y-0.5" aria-label={title}>
        {fields.map((field) => (
          <FieldRow key={field} field={field} onFieldClick={onFieldClick} />
        ))}
      </ul>
    </section>
  );
}

export function DatasetFieldGroups({
  columns,
  columnsLoading,
  columnsReady,
  datasetSelected,
  onFieldClick,
  onRefresh,
  showHeader = true,
}: DatasetFieldGroupsProps) {
  const [search, setSearch] = useState("");

  const filteredColumns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return columns;
    return columns.filter((column) => column.toLowerCase().includes(q));
  }, [columns, search]);

  const { dimensions, metrics } = groupDatasetFields(filteredColumns);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {showHeader ? (
        <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
          <h4 className="text-theme-xs font-semibold text-gray-700 dark:text-gray-300">字段</h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-7 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="刷新字段"
            onClick={() => onRefresh?.()}
            disabled={!datasetSelected || columnsLoading}
          >
            <RefreshCw className={cn("size-3.5", columnsLoading && "animate-spin")} aria-hidden />
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 justify-end px-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-7 p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="刷新字段"
            onClick={() => onRefresh?.()}
            disabled={!datasetSelected || columnsLoading}
          >
            <RefreshCw className={cn("size-3.5", columnsLoading && "animate-spin")} aria-hidden />
          </Button>
        </div>
      )}
      <div className="shrink-0 px-3 pb-2" onPointerDown={(event) => event.stopPropagation()}>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="搜索字段"
          aria-label="搜索字段"
          inputClassName="h-9 text-theme-xs"
          disabled={!datasetSelected}
        />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-3">
        {!datasetSelected ? (
          <p className="px-2 py-4 text-center text-theme-xs text-gray-500 dark:text-gray-400">
            选择数据集后显示字段
          </p>
        ) : columnsReady && columnsLoading ? (
          <p className="px-2 py-4 text-theme-xs text-gray-500">加载中…</p>
        ) : filteredColumns.length === 0 ? (
          <p className="px-2 py-4 text-center text-theme-xs text-gray-500 dark:text-gray-400">
            {columns.length === 0 ? "暂无可用字段" : "无匹配字段"}
          </p>
        ) : (
          <>
            <FieldSection title="维度" fields={dimensions} onFieldClick={onFieldClick} />
            <FieldSection title="指标" fields={metrics} onFieldClick={onFieldClick} />
          </>
        )}
      </div>
    </div>
  );
}
