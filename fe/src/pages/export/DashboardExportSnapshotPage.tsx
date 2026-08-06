import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { DashboardLayoutPreview } from "@/components/dashboard/DashboardLayoutPreview";
import { DataScreenPresenter } from "@/components/dashboard/screen/DataScreenPresenter";
import { fetchExportLayout } from "@/lib/exportSnapshot";
import { DASHBOARD_THUMBNAIL_CAPTURE_ATTR } from "@/lib/captureDashboardThumbnail";
import "./exportSnapshotPrint.css";

type ExportDetail = {
  id: string;
  name: string;
  layoutJson: DashboardLayout;
  surfaceKind: "dashboard" | "data-screen";
};

type DashboardExportSnapshotPageProps = {
  surface: "dashboard" | "data-screen";
};

function formatExportTimestamp(date: Date): string {
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarizeFilters(layout: DashboardLayout): string | null {
  const filters = layout.globalFilters ?? [];
  if (filters.length === 0) return null;
  return `已应用 ${filters.length} 项全局筛选`;
}

export function DashboardExportSnapshotPage({ surface }: DashboardExportSnapshotPageProps) {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [detail, setDetail] = useState<ExportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const generatedAt = useMemo(() => formatExportTimestamp(new Date()), [detail?.id]);

  useEffect(() => {
    if (!id || !token) {
      setError("缺少 export token");
      return;
    }
    let cancelled = false;
    void fetchExportLayout(id, token)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "无法加载看板");
      });
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  useEffect(() => {
    if (!detail) return;
    const timer = window.setTimeout(() => setReady(true), 1400);
    return () => window.clearTimeout(timer);
  }, [detail]);

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center bg-gray-950 p-6 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!detail) {
    return <div className="h-dvh bg-gray-950" data-export-loading />;
  }

  const isScreen = surface === "data-screen" || detail.surfaceKind === "data-screen";
  const layout = detail.layoutJson;
  const filterSummary = summarizeFilters(layout);

  return (
    <div
      className="export-snapshot-root min-h-dvh bg-gray-950 text-white"
      data-export-snapshot
      data-export-ready={ready ? "true" : undefined}
      {...{ [DASHBOARD_THUMBNAIL_CAPTURE_ATTR]: "" }}
    >
      <header className="export-snapshot-header border-b border-white/10 bg-gray-900/95 px-6 py-3 print:border-gray-300 print:bg-white print:text-gray-900">
        <p className="text-lg font-semibold tracking-tight">{detail.name}</p>
        <p className="mt-0.5 text-xs text-gray-400 print:text-gray-600">
          {isScreen ? "数据大屏" : "仪表板"} · 生成时间 {generatedAt}
          {filterSummary ? ` · ${filterSummary}` : ""}
        </p>
      </header>
      <main className="export-snapshot-body">
        {isScreen && layout.version === 2 ? (
          <DataScreenPresenter layout={layout} presentationMode="original" className="min-h-[calc(100dvh-4rem)]" />
        ) : (
          <div className="min-h-[calc(100dvh-4rem)] p-0" {...{ [DASHBOARD_THUMBNAIL_CAPTURE_ATTR]: "" }}>
            <DashboardLayoutPreview layout={layout} className="min-h-full" />
          </div>
        )}
      </main>
    </div>
  );
}
