import { Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TruncateHint } from "@/components/ui/hint-tooltip";
import {
  formatSyncDatasourceStructured,
  type DatasourceDisplayFields,
} from "@/lib/formatDatasourceDisplay";
import { cn } from "@/lib/utils";

const READOUT_SHELL_CLASS =
  "rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]";

/** 同步产物页顶栏：左右读数卡等高 */
export const SYNC_HEADER_READOUT_MIN_H = "min-h-[5.5rem]";

export const SYNC_HEADER_LABEL_BLOCK_CLASS = "grid min-h-10 content-start gap-0.5";

export function SyncOutputConnectionReadout({
  datasource,
  className,
  id,
  tall = false,
  "data-testid": dataTestId,
}: {
  datasource: DatasourceDisplayFields;
  className?: string;
  id?: string;
  tall?: boolean;
  "data-testid"?: string;
}) {
  const info = formatSyncDatasourceStructured(datasource);

  return (
    <div
      id={id}
      data-testid={dataTestId}
      className={cn(
        READOUT_SHELL_CLASS,
        "grid content-center gap-1.5",
        tall && cn(SYNC_HEADER_READOUT_MIN_H, "h-full"),
        className,
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <TruncateHint
          title={info.name}
          className="min-w-0 flex-1 text-theme-sm font-medium leading-snug text-gray-800 dark:text-gray-200"
        >
          {info.name}
        </TruncateHint>
        {info.type ? (
          <Badge variant="light" color="light" size="sm" className="shrink-0 font-mono uppercase">
            {info.type}
          </Badge>
        ) : null}
      </div>
      {info.connectionLine ? (
        <TruncateHint
          title={info.connectionLine}
          className="block min-w-0 font-mono text-theme-xs leading-relaxed text-gray-600 dark:text-gray-300"
        >
          {info.connectionLine}
        </TruncateHint>
      ) : null}
      {info.code ? (
        <p className="min-w-0 truncate text-theme-xs leading-relaxed text-gray-500 dark:text-gray-400">
          <span className="text-gray-400 dark:text-gray-500">code</span>{" "}
          <span className="font-mono text-gray-600 dark:text-gray-300">{info.code}</span>
        </p>
      ) : null}
    </div>
  );
}

export function DatasetQualifiedTableReadout({
  tableName,
  className,
  tall = false,
}: {
  tableName: string;
  className?: string;
  /** 与 SyncOutputConnectionReadout 顶栏等高 */
  tall?: boolean;
}) {
  return (
    <div
      className={cn(
        READOUT_SHELL_CLASS,
        "flex min-w-0 items-center gap-2",
        tall && cn(SYNC_HEADER_READOUT_MIN_H, "h-full"),
        className,
      )}
    >
      <Database className="size-4 shrink-0 text-gray-400" aria-hidden />
      <TruncateHint
        title={tableName}
        className="min-w-0 flex-1 font-mono text-theme-sm leading-snug text-gray-800 dark:text-gray-200"
      >
        {tableName}
      </TruncateHint>
    </div>
  );
}
