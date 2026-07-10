import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Eye } from "lucide-react";
import { AdminPageShell } from "@/components/layout/admin-page-shell";
import {
  DataTable,
  ListPageBody,
  ListPagePagination,
  ListPageSection,
  ListPageToolbar,
  PageErrorBanner,
  RowActions,
} from "@/components/layout/list-page-kit";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { mapApiError } from "@/lib/apiError";
import { queryKeys } from "@/lib/queryKeys";
import { useListPagination } from "@/lib/list-pagination";
import { AuditDetailSheet } from "./AuditDetailSheet";
import {
  AUDIT_TARGET_TYPE_OPTIONS,
  auditActionLabel,
  auditTargetTypeLabel,
  formatAuditSummary,
  formatAuditTimestamp,
  shortId,
  type AuditEventRow,
} from "./audit-display";

export function AuditLogPage() {
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState<string>("all");
  const [createdAfter, setCreatedAfter] = useState("");
  const [createdBefore, setCreatedBefore] = useState("");
  const [debounced, setDebounced] = useState({
    action: "",
    targetType: "",
    createdAfter: "",
    createdBefore: "",
  });
  const [selected, setSelected] = useState<AuditEventRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(
      () =>
        setDebounced({
          action: action.trim(),
          targetType: targetType === "all" ? "" : targetType,
          createdAfter: createdAfter.trim(),
          createdBefore: createdBefore.trim(),
        }),
      300,
    );
    return () => window.clearTimeout(t);
  }, [action, targetType, createdAfter, createdBefore]);

  const pagination = useListPagination(20, [
    debounced.action,
    debounced.targetType,
    debounced.createdAfter,
    debounced.createdBefore,
  ]);

  const params = useMemo(() => {
    const p: Record<string, string> = {
      limit: String(pagination.pageSize),
      offset: String(pagination.offset),
    };
    if (debounced.action) p.action = debounced.action;
    if (debounced.targetType) p.target_type = debounced.targetType;
    if (debounced.createdAfter) {
      p.created_after = new Date(debounced.createdAfter).toISOString();
    }
    if (debounced.createdBefore) {
      p.created_before = new Date(debounced.createdBefore).toISOString();
    }
    return p;
  }, [debounced, pagination.pageSize, pagination.offset]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.audit.events(params),
    queryFn: () => {
      const q = new URLSearchParams(params);
      return apiFetch<{ items: AuditEventRow[]; total: number }>(`/api/v1/audit/events?${q}`);
    },
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const openDetail = (event: AuditEventRow) => {
    setSelected(event);
    setDetailOpen(true);
  };

  return (
    <AdminPageShell
      title="审计日志"
      description="记录平台内的账号、角色、组织等敏感操作，便于安全审计与问题追溯。"
    >
      {isError ? (
        <PageErrorBanner message={mapApiError(error)} onRetry={() => void refetch()} />
      ) : null}

      <ListPageSection>
        <ListPageToolbar
          filters={
            <>
              <div className="grid w-full gap-2 sm:max-w-md">
                <Label htmlFor="audit-action-search" className="sr-only">
                  搜索操作
                </Label>
                <SearchField
                  value={action}
                  onChange={setAction}
                  placeholder="按操作编码筛选，如 user.roles.replace"
                  aria-label="搜索操作"
                />
              </div>
              <div className="grid w-full gap-2 sm:w-[160px]">
                <Label htmlFor="audit-target-type" className="sr-only">
                  目标类型
                </Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger id="audit-target-type" className="h-11" aria-label="筛选目标类型">
                    <SelectValue placeholder="目标类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_TARGET_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid w-full gap-1 sm:w-[200px]">
                <Label htmlFor="audit-created-after" className="text-theme-xs text-gray-500">
                  起始时间
                </Label>
                <Input
                  id="audit-created-after"
                  type="datetime-local"
                  className="h-11"
                  value={createdAfter}
                  onChange={(e) => setCreatedAfter(e.target.value)}
                  aria-label="筛选起始时间"
                />
              </div>
              <div className="grid w-full gap-1 sm:w-[200px]">
                <Label htmlFor="audit-created-before" className="text-theme-xs text-gray-500">
                  结束时间
                </Label>
                <Input
                  id="audit-created-before"
                  type="datetime-local"
                  className="h-11"
                  value={createdBefore}
                  onChange={(e) => setCreatedBefore(e.target.value)}
                  aria-label="筛选结束时间"
                />
              </div>
            </>
          }
          actions={
            !isLoading &&
            data &&
            (debounced.action ||
              debounced.targetType ||
              debounced.createdAfter ||
              debounced.createdBefore) ? (
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                筛选结果 {items.length} 条
              </p>
            ) : null
          }
        />

        <ListPageBody className="p-0">
          <DataTable
            loading={isLoading}
            empty={!isLoading && items.length === 0}
            headers={["时间", "操作", "操作者", "目标", "摘要", ""]}
            lastColumnAlign="right"
            loadingRows={6}
            emptyState={{
              icon: <ClipboardList className="size-7" aria-hidden />,
              title: "暂无审计记录",
              description: "调整筛选条件，或等待平台产生新的操作事件。",
            }}
            rows={items.map((row) => {
              const stamp = formatAuditTimestamp(row.created_at);
              return [
                <div key={`${row.id}-time`} className="min-w-[108px]">
                  <p className="text-theme-sm text-gray-800 dark:text-white/90">{stamp.date}</p>
                  <p className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">{stamp.time}</p>
                </div>,
                <div key={`${row.id}-action`} className="min-w-[180px]">
                  <Badge variant="light" color="primary" size="sm">
                    {auditActionLabel(row.action)}
                  </Badge>
                  <p className="mt-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                    {row.action}
                  </p>
                </div>,
                <span key={`${row.id}-actor`} className="font-medium text-gray-800 dark:text-white/90">
                  {row.actor_username ?? shortId(row.actor_id)}
                </span>,
                <div key={`${row.id}-target`} className="min-w-[140px]">
                  <Badge variant="light" color="light" size="sm">
                    {auditTargetTypeLabel(row.target_type)}
                  </Badge>
                  <p className="mt-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                    {shortId(row.target_id)}
                  </p>
                </div>,
                <p
                  key={`${row.id}-summary`}
                  className="max-w-md text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400"
                  title={formatAuditSummary(row)}
                >
                  {formatAuditSummary(row)}
                </p>,
                <RowActions key={`${row.id}-actions`}>
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="查看详情"
                    onClick={() => openDetail(row)}
                  >
                    <Eye className="size-4" />
                  </IconButton>
                </RowActions>,
              ];
            })}
          />
        </ListPageBody>

        {!isLoading && total > 0 ? (
          <ListPagePagination
            current={pagination.page}
            pageSize={pagination.pageSize}
            total={total}
            showSizeChanger
            onChange={pagination.onPageChange}
          />
        ) : null}
      </ListPageSection>

      <AuditDetailSheet event={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </AdminPageShell>
  );
}
