import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import type { DashboardLayout } from "@/components/dashboard/layoutUtils";
import { DashboardLayoutPreview } from "@/components/dashboard/DashboardLayoutPreview";
import { DataScreenPresenter } from "@/components/dashboard/screen/DataScreenPresenter";
import { fetchExportLayout } from "@/lib/exportSnapshot";
import { DASHBOARD_THUMBNAIL_CAPTURE_ATTR } from "@/lib/captureDashboardThumbnail";

type ExportDetail = {
  id: string;
  name: string;
  layoutJson: DashboardLayout;
  surfaceKind: "dashboard" | "data-screen";
};

type DashboardExportSnapshotPageProps = {
  surface: "dashboard" | "data-screen";
};

export function DashboardExportSnapshotPage({ surface }: DashboardExportSnapshotPageProps) {
  const { id = "" } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [detail, setDetail] = useState<ExportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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

  return (
    <div
      className="min-h-dvh bg-gray-950"
      data-export-snapshot
      data-export-ready={ready ? "true" : undefined}
      {...{ [DASHBOARD_THUMBNAIL_CAPTURE_ATTR]: "" }}
    >
      {isScreen && layout.version === 2 ? (
        <DataScreenPresenter layout={layout} presentationMode="original" className="min-h-dvh" />
      ) : (
        <div className="min-h-dvh p-0" {...{ [DASHBOARD_THUMBNAIL_CAPTURE_ATTR]: "" }}>
          <DashboardLayoutPreview layout={layout} className="min-h-dvh" />
        </div>
      )}
    </div>
  );
}
