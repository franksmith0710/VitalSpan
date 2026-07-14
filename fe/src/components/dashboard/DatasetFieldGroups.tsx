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
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white dark:hover:bg-white/[0.06]"
      >
        <GripVertical className="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
        <span className="flex size-5 shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-white/5">
          <FieldIcon field={field} />
        </span>
        <span className="min-w-0 flex-1 truncate text-theme-xs text-gray-800 dark:text-white/90">
          {field}
        </span>
      </button>
    </li>
  );
}

/** DataEase：维度 / 指标分组常显，无字段时保留分区标题与留白 */
function FieldSection({
  title,
  fields,
  onFieldClick,
  showDivider,
}: {
  title: string;
  fields: string[];
  onFieldClick?: (fieldName: string) => void;
  showDivider?: boolean;
}) {
  return (
    <section className={cn("space-y-1", showDivider && "border-t border-gray-200 pt-3 dark:border-gray-800")}>
      <h5 className="px-2 text-theme-xs font-medium text-gray-600 dark:text-gray-400">{title}</h5>
      {fields.length > 0 ? (
        <ul className="space-y-0.5" aria-label={title}>
          {fields.map((field) => (
            <FieldRow key={field} field={field} onFieldClick={onFieldClick} />
          ))}
        </ul>
      ) : (
        <div className="min-h-[2rem] px-2" aria-hidden />
      )}
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
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-white/[0.06]">
        <h4 className="text-theme-xs font-semibold text-gray-800 dark:text-white/90">字段</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-7 rounded-full p-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="刷新字段"
          onClick={() => onRefresh?.()}
          disabled={!datasetSelected || columnsLoading}
        >
          <RefreshCw className={cn("size-3.5", columnsLoading && "animate-spin")} aria-hidden />
        </Button>
      </div>
      <div className="shrink-0 px-3 py-2" onPointerDown={(event) => event.stopPropagation()}>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="搜索字段"
          aria-label="搜索字段"
          inputClassName="h-8 text-theme-xs"
          disabled={!datasetSelected}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-3">
        {!datasetSelected ? (
          <div className="space-y-3">
            <FieldSection title="维度" fields={[]} onFieldClick={onFieldClick} />
            <FieldSection title="指标" fields={[]} onFieldClick={onFieldClick} showDivider />
          </div>
        ) : columnsReady && columnsLoading ? (
          <p className="px-2 py-6 text-theme-xs text-gray-500">加载中…</p>
        ) : filteredColumns.length === 0 && columns.length > 0 ? (
          <div className="space-y-3">
            <FieldSection title="维度" fields={[]} onFieldClick={onFieldClick} />
            <FieldSection title="指标" fields={[]} onFieldClick={onFieldClick} showDivider />
          </div>
        ) : (
          <div className="space-y-3">
            <FieldSection title="维度" fields={dimensions} onFieldClick={onFieldClick} />
            <FieldSection title="指标" fields={metrics} onFieldClick={onFieldClick} showDivider />
          </div>
        )}
      </div>
    </div>
  );
}
