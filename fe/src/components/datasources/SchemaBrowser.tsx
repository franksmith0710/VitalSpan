import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Copy, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { buildSelectSql, mapMetadataError, qualifiedTableName } from "./schemaBrowserUtils";

type SchemaItem = { name: string };
type TableItem = { name: string; type: string };
type ColumnItem = { name: string; dataType: string; nullable: boolean };

async function copyText(text: string, label: string) {
  await navigator.clipboard.writeText(text);
  toast.success(`已复制${label}`);
}

type SchemaSectionProps = {
  dataSourceId: string;
  schema: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openTables: Record<string, boolean>;
  setOpenTables: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
};

function SchemaSection({
  dataSourceId,
  schema,
  open,
  onOpenChange,
  openTables,
  setOpenTables,
}: SchemaSectionProps) {
  const tablesQuery = useQuery({
    queryKey: queryKeys.datasources.tables(dataSourceId, schema),
    queryFn: () =>
      apiFetch<{ items: TableItem[] }>(
        `/api/v1/datasources/${dataSourceId}/tables?schema=${encodeURIComponent(schema)}`,
      ),
    enabled: open && Boolean(dataSourceId),
  });

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-theme-sm hover:bg-gray-50 dark:hover:bg-white/5">
        <ChevronRight className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        <span className="truncate font-medium" title={schema}>
          {schema}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 space-y-0.5 border-l border-gray-100 pl-3 dark:border-gray-800">
        {tablesQuery.isLoading ? <Skeleton className="my-1 h-6 w-full" /> : null}
        {tablesQuery.isError ? (
          <p className="py-1 text-theme-xs text-error-500">{mapMetadataError(tablesQuery.error)}</p>
        ) : null}
        {(tablesQuery.data?.items ?? []).map((table) => (
          <TableSection
            key={table.name}
            dataSourceId={dataSourceId}
            schema={schema}
            table={table}
            open={Boolean(openTables[`${schema}.${table.name}`])}
            onOpenChange={(o) =>
              setOpenTables((s) => ({ ...s, [`${schema}.${table.name}`]: o }))
            }
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

type TableSectionProps = {
  dataSourceId: string;
  schema: string;
  table: TableItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function TableSection({ dataSourceId, schema, table, open, onOpenChange }: TableSectionProps) {
  const tableKey = qualifiedTableName(schema, table.name);
  const columnsQuery = useQuery({
    queryKey: queryKeys.datasources.columns(dataSourceId, schema, table.name),
    queryFn: () =>
      apiFetch<{ items: ColumnItem[] }>(
        `/api/v1/datasources/${dataSourceId}/columns?schema=${encodeURIComponent(schema)}&table=${encodeURIComponent(table.name)}`,
      ),
    enabled: open && Boolean(dataSourceId),
  });

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center gap-1">
        <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1 text-left text-theme-sm hover:bg-gray-50 dark:hover:bg-white/5">
          <ChevronRight className={`size-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="truncate" title={table.name}>
            {table.name}
          </span>
          <Badge variant="light" className="shrink-0 text-theme-xs">
            {table.type}
          </Badge>
        </CollapsibleTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-7 shrink-0 p-0" aria-label="表操作">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void copyText(tableKey, "表名")}>
              <Copy className="mr-2 size-3.5" />
              复制表名
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void copyText(buildSelectSql(schema, table.name), "SQL")}>
              <Copy className="mr-2 size-3.5" />
              生成 SELECT
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CollapsibleContent className="ml-5 space-y-0.5 border-l border-gray-100 pl-3 dark:border-gray-800">
        {columnsQuery.isLoading ? <Skeleton className="my-1 h-5 w-full" /> : null}
        {(columnsQuery.data?.items ?? []).map((col) => (
          <div
            key={col.name}
            className="flex items-center justify-between gap-2 py-0.5 text-theme-xs text-gray-600 dark:text-gray-400"
          >
            <span className="truncate" title={col.name}>
              {col.name}
            </span>
            <span className="shrink-0 text-gray-400">
              {col.dataType}
              {col.nullable ? "" : " · NOT NULL"}
            </span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SchemaBrowser({ dataSourceId }: { dataSourceId: string }) {
  const [openSchemas, setOpenSchemas] = useState<Record<string, boolean>>({});
  const [openTables, setOpenTables] = useState<Record<string, boolean>>({});

  const schemasQuery = useQuery({
    queryKey: queryKeys.datasources.schemas(dataSourceId),
    queryFn: () => apiFetch<{ items: SchemaItem[] }>(`/api/v1/datasources/${dataSourceId}/schemas`),
    enabled: Boolean(dataSourceId),
  });

  if (schemasQuery.isLoading) {
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>元数据浏览</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (schemasQuery.isError) {
    const msg = mapMetadataError(schemasQuery.error);
    return (
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>元数据浏览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-error-500 bg-error-50 p-4 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            <p>{msg}</p>
            <Button className="mt-3" variant="outline" size="sm" onClick={() => void schemasQuery.refetch()}>
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const schemas = schemasQuery.data?.items ?? [];

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>元数据浏览</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {schemas.length === 0 ? (
          <p className="text-theme-sm text-gray-500">暂无 schema</p>
        ) : (
          schemas.map((schema) => (
            <SchemaSection
              key={schema.name}
              dataSourceId={dataSourceId}
              schema={schema.name}
              open={Boolean(openSchemas[schema.name])}
              onOpenChange={(o) => setOpenSchemas((s) => ({ ...s, [schema.name]: o }))}
              openTables={openTables}
              setOpenTables={setOpenTables}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
